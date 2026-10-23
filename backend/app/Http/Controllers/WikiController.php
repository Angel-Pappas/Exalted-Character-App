<?php

namespace App\Http\Controllers;

use App\Enums\WikiKind;
use App\Models\Character;
use App\Models\User;
use App\Models\WikiPage;
use App\Support\WikiImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * A character's People & Places wiki: pages about people, places and groups,
 * linked to each other. Like the Circle notes, only the character's owner sees
 * or edits it — not the Storyteller, not admins.
 *
 * The client gets every page at once (a wiki stays small) and works out the
 * derived lists — who is in a place, a group's members, what links where —
 * itself (src/lib/wiki.ts). The server keeps the facts consistent: a page's
 * place is a place, its groups are groups, and places never contain themselves.
 */
class WikiController extends Controller
{
    public function index(Request $request, Character $character): JsonResponse
    {
        $this->ownerOnly($request, $character);

        $pages = WikiPage::where('character_id', $character->id)->with('groups:id')->orderBy('name')->get();

        return response()->json($pages->map(fn (WikiPage $page) => $this->present($page)));
    }

    public function store(Request $request, Character $character): JsonResponse
    {
        $this->ownerOnly($request, $character);
        $validated = $request->validate([
            'kind' => ['required', Rule::enum(WikiKind::class)],
            'name' => ['required', 'string', 'max:200'],
        ]);
        $name = $this->uniqueName($character, $validated['name']);

        $page = WikiPage::create([
            'character_id' => $character->id,
            'kind' => $validated['kind'],
            'name' => $name,
            'sections' => [],
        ]);

        return response()->json($this->present($page->load('groups:id')), 201);
    }

    /** Saves the whole page: name, kind, place, groups, text and sections. */
    public function update(Request $request, Character $character, WikiPage $page): JsonResponse
    {
        $this->ownerOnly($request, $character);
        $this->inWiki($character, $page);

        $validated = $request->validate([
            'kind' => ['required', Rule::enum(WikiKind::class)],
            'name' => ['required', 'string', 'max:200'],
            'place_id' => ['present', 'nullable', 'uuid'],
            'group_ids' => ['present', 'array', 'max:100'],
            'group_ids.*' => ['uuid', 'distinct'],
            'body' => ['present', 'nullable', 'array'],
            'sections' => ['present', 'array', 'max:50'],
            'sections.*.id' => ['required', 'string', 'max:64'],
            'sections.*.title' => ['present', 'nullable', 'string', 'max:200'],
            'sections.*.body' => ['present', 'nullable', 'array'],
        ]);

        $kind = WikiKind::from($validated['kind']);
        $name = $this->uniqueName($character, $validated['name'], $page);
        $placeId = $validated['place_id'];
        /** @var list<string> $groupIds */
        $groupIds = $validated['group_ids'];

        if ($placeId !== null) {
            $this->checkPlace($character, $page, $kind, $placeId);
        }
        $this->checkGroups($character, $page, $groupIds);

        DB::transaction(function () use ($request, $page, $kind, $name, $placeId, $groupIds) {
            // A page that stops being a place no longer holds anyone; one that stops
            // being a group no longer has members.
            if ($page->kind === WikiKind::Place && $kind !== WikiKind::Place) {
                WikiPage::where('place_id', $page->id)->update(['place_id' => null]);
            }
            if ($page->kind === WikiKind::Group && $kind !== WikiKind::Group) {
                DB::table('wiki_page_groups')->where('group_id', $page->id)->delete();
            }

            $page->update([
                'kind' => $kind,
                'name' => $name,
                'place_id' => $placeId,
                'body' => $this->rawJsonField($request, 'body'),
                'sections' => $this->rawJsonField($request, 'sections'),
            ]);
            $page->groups()->sync($groupIds);
        });

        return response()->json($this->present($page->refresh()->load('groups:id')));
    }

    public function destroy(Request $request, Character $character, WikiPage $page): Response
    {
        $this->ownerOnly($request, $character);
        $this->inWiki($character, $page);

        if ($page->image_path !== null) {
            Storage::disk('local')->delete($page->image_path);
        }
        $page->delete();

        return response()->noContent();
    }

    /**
     * Sets the page's image. The browser has already shrunk it (to stay under the
     * server's 2 MB upload limit), which also drops the photo's hidden metadata.
     */
    public function storeImage(Request $request, Character $character, WikiPage $page): JsonResponse
    {
        $this->ownerOnly($request, $character);
        $this->inWiki($character, $page);
        $request->validate(['image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:2048']]);

        $file = $request->file('image');
        abort_unless($file instanceof UploadedFile, 422);
        $path = $file->storeAs(
            WikiImages::folder($character->id),
            "{$page->id}-".Str::lower(Str::random(8)).'.'.$file->extension(),
            'local',
        );
        abort_if($path === false, 500, 'The image could not be stored.');

        if ($page->image_path !== null) {
            Storage::disk('local')->delete($page->image_path);
        }
        $page->update(['image_path' => $path]);

        return response()->json($this->present($page->load('groups:id')));
    }

    public function showImage(Request $request, Character $character, WikiPage $page): StreamedResponse
    {
        $this->ownerOnly($request, $character);
        $this->inWiki($character, $page);
        abort_if($page->image_path === null, 404);

        // The address changes with every new image (see present()), so it can be kept long.
        return Storage::disk('local')->response($page->image_path, null, [
            'Cache-Control' => 'private, max-age=31536000, immutable',
        ]);
    }

    public function destroyImage(Request $request, Character $character, WikiPage $page): JsonResponse
    {
        $this->ownerOnly($request, $character);
        $this->inWiki($character, $page);

        if ($page->image_path !== null) {
            Storage::disk('local')->delete($page->image_path);
            $page->update(['image_path' => null]);
        }

        return response()->json($this->present($page->load('groups:id')));
    }

    /** @return array<string, mixed> */
    private function present(WikiPage $page): array
    {
        return [
            'id' => $page->id,
            'kind' => $page->kind->value,
            'name' => $page->name,
            'place_id' => $page->place_id,
            'group_ids' => $page->groups->pluck('id')->values(),
            'body' => $page->body,
            'sections' => $page->sections ?? [],
            'image' => $page->image_path === null ? null
                : "/api/characters/{$page->character_id}/wiki/{$page->id}/image?v=".md5($page->image_path),
            'updated_at' => $page->updated_at?->toIso8601String(),
        ];
    }

    /** Names are unique within a wiki, ignoring case, so a link written as a name finds one page. */
    private function uniqueName(Character $character, string $name, ?WikiPage $except = null): string
    {
        $name = trim($name);
        $taken = WikiPage::where('character_id', $character->id)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->when($except, fn ($q) => $q->where('id', '!=', $except?->id))
            ->exists();
        if ($name === '' || $taken) {
            throw ValidationException::withMessages(['name' => $name === '' ? 'A page needs a name.' : 'There is already a page called that.']);
        }

        return $name;
    }

    /** A page's place must be a place in this wiki, and a place can't end up inside itself. */
    private function checkPlace(Character $character, WikiPage $page, WikiKind $kind, string $placeId): void
    {
        $places = WikiPage::where('character_id', $character->id)->where('kind', WikiKind::Place)->pluck('place_id', 'id');
        if (! $places->has($placeId) || $placeId === $page->id) {
            throw ValidationException::withMessages(['place_id' => 'Pick one of your places.']);
        }
        if ($kind !== WikiKind::Place) {
            return;
        }
        // Walk up from the chosen place; meeting this page means a loop.
        $seen = [];
        for ($at = $placeId; $at !== null && ! isset($seen[$at]); $at = $places->get($at)) {
            if ($at === $page->id) {
                throw ValidationException::withMessages(['place_id' => "A place can't be inside one of its own places."]);
            }
            $seen[$at] = true;
        }
    }

    /** @param  list<string>  $groupIds */
    private function checkGroups(Character $character, WikiPage $page, array $groupIds): void
    {
        $found = WikiPage::where('character_id', $character->id)->where('kind', WikiKind::Group)
            ->whereIn('id', $groupIds)->count();
        if ($found !== count($groupIds) || in_array($page->id, $groupIds, true)) {
            throw ValidationException::withMessages(['group_ids' => 'Pick from your groups.']);
        }
    }

    private function ownerOnly(Request $request, Character $character): User
    {
        /** @var User $me */
        $me = $request->user();
        abort_unless($character->user_id === $me->id, 403);

        return $me;
    }

    private function inWiki(Character $character, WikiPage $page): void
    {
        abort_unless($page->character_id === $character->id, 404);
    }
}
