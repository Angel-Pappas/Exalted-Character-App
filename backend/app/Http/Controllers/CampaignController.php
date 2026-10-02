<?php

namespace App\Http\Controllers;

use App\Enums\CharacterKind;
use App\Models\Campaign;
use App\Models\CampaignCharacter;
use App\Models\Character;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Campaigns: anyone can start one and becomes its Storyteller. Only members
 * can open a campaign; only the Storyteller can rename or delete it, add or
 * remove members and hand the role on. Any member except the Storyteller can
 * leave. A member's characters leave the campaign with them; none is deleted.
 */
class CampaignController extends Controller
{
    /** The campaigns the signed-in user is in. */
    public function index(Request $request): JsonResponse
    {
        $me = $this->me($request);

        $campaigns = $me->campaigns()->with('storyteller')->withCount('members')->orderBy('name')->get();

        return response()->json($campaigns->map(fn (Campaign $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'storyteller' => $this->person($c->storyteller),
            'is_storyteller' => $c->isStoryteller($me),
            'member_count' => $c->getAttribute('members_count'),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => ['required', 'string', 'max:255']]);
        $me = $this->me($request);

        $campaign = DB::transaction(function () use ($validated, $me) {
            $campaign = Campaign::create(['name' => $validated['name'], 'storyteller_id' => $me->id]);
            $campaign->members()->attach($me->id);

            return $campaign;
        });

        return response()->json(['id' => $campaign->id], 201);
    }

    /**
     * The campaign as the signed-in member may see it: every PC's name, but an
     * NPC only when they can open its sheet; `can_view` says whether they can.
     */
    public function show(Request $request, Campaign $campaign): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($campaign->hasMember($me), 403);

        $campaign->load(['storyteller', 'members', 'characters.user']);

        $characters = $campaign->characters
            ->map(function (Character $character) use ($campaign, $me) {
                /** @var CampaignCharacter $place */
                $place = $character->getRelation('pivot');
                $canView = $campaign->letsSee($me, $character, $place->visibility) || $me->isAdmin();
                $listed = $character->kind === CharacterKind::Pc || $campaign->letsSee($me, $character, $place->visibility);

                return $listed ? [
                    'id' => $character->id,
                    'name' => $character->name,
                    'kind' => $character->kind,
                    'visibility' => $place->visibility,
                    'owner' => $this->person($character->user),
                    'mine' => $character->user_id === $me->id,
                    'can_view' => $canView,
                ] : null;
            })
            ->filter()
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json([
            'id' => $campaign->id,
            'name' => $campaign->name,
            'storyteller' => $this->person($campaign->storyteller),
            'is_storyteller' => $campaign->isStoryteller($me),
            'members' => $campaign->members->sortBy('username')->values()->map(fn (User $u) => $this->person($u)),
            'characters' => $characters,
        ]);
    }

    public function update(Request $request, Campaign $campaign): Response
    {
        $this->storytellerOnly($request, $campaign);
        $validated = $request->validate(['name' => ['required', 'string', 'max:255']]);

        $campaign->update(['name' => $validated['name']]);

        return response()->noContent();
    }

    /** Deletes the campaign only — its characters stay with their owners. */
    public function destroy(Request $request, Campaign $campaign): Response
    {
        $this->storytellerOnly($request, $campaign);

        $campaign->delete();

        return response()->noContent();
    }

    /** The Storyteller adds a user by username. Adding someone already in is a no-op. */
    public function addMember(Request $request, Campaign $campaign): Response
    {
        $this->storytellerOnly($request, $campaign);
        $validated = $request->validate(['username' => ['required', 'string']]);

        $user = User::where('username', strtolower(trim($validated['username'])))->first();
        abort_if($user === null, 422, 'No user with that username.');

        $campaign->members()->syncWithoutDetaching([$user->id]);

        return response()->noContent();
    }

    /**
     * The Storyteller removes a member, or a member leaves. The Storyteller
     * can't leave without handing the role on first. The member's characters
     * leave the campaign too.
     */
    public function removeMember(Request $request, Campaign $campaign, User $user): Response
    {
        $me = $this->me($request);
        abort_unless($campaign->isStoryteller($me) || $me->id === $user->id, 403);
        abort_if($campaign->isStoryteller($user), 422, 'Hand the Storyteller role to someone else first.');

        DB::transaction(function () use ($campaign, $user) {
            $campaign->characters()->detach($user->characters()->pluck('id'));
            $campaign->members()->detach($user->id);
        });

        return response()->noContent();
    }

    /** Hands the Storyteller role to another member; the old Storyteller stays a member. */
    public function transfer(Request $request, Campaign $campaign): Response
    {
        $this->storytellerOnly($request, $campaign);
        $validated = $request->validate(['user_id' => ['required', 'string']]);

        $next = User::whereKey($validated['user_id'])->first();
        abort_unless($next !== null && $campaign->hasMember($next), 422, 'Only a member of the campaign can become its Storyteller.');

        $campaign->update(['storyteller_id' => $next->id]);

        return response()->noContent();
    }

    private function storytellerOnly(Request $request, Campaign $campaign): void
    {
        abort_unless($campaign->isStoryteller($this->me($request)), 403);
    }

    private function me(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }

    /**
     * @return array{id: string, username: string}
     */
    private function person(User $user): array
    {
        return ['id' => $user->id, 'username' => $user->username];
    }
}
