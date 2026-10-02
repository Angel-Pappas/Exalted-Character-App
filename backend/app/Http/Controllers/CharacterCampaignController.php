<?php

namespace App\Http\Controllers;

use App\Enums\Visibility;
use App\Models\Campaign;
use App\Models\CampaignCharacter;
use App\Models\Character;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A character's options: its name, PC or NPC, and which of its owner's
 * campaigns it is in, public or private in each. All of it is the owner's
 * call (admins keep their full access); a campaign's Storyteller may also take
 * a character out of their campaign.
 */
class CharacterCampaignController extends Controller
{
    public function settings(Request $request, Character $character): Response
    {
        Gate::authorize('update', $character);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'kind' => ['required', Rule::in(['pc', 'npc'])],
        ]);

        $character->update($validated);

        return response()->noContent();
    }

    /** Every campaign the owner is in, and this character's place in each (if any). */
    public function index(Character $character): JsonResponse
    {
        Gate::authorize('update', $character);

        $joined = $character->campaigns->keyBy('id');
        $campaigns = $character->user->campaigns()->orderBy('name')->get();

        return response()->json($campaigns->map(function (Campaign $campaign) use ($joined) {
            $place = $joined->get($campaign->id)?->getRelation('pivot');

            return [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'joined' => $place instanceof CampaignCharacter,
                'visibility' => $place instanceof CampaignCharacter ? $place->visibility : null,
            ];
        }));
    }

    /**
     * Puts the character into a campaign its owner is in — public if a PC,
     * private if an NPC, unless a visibility is given — or changes its
     * visibility there if it is already in.
     */
    public function update(Request $request, Character $character, Campaign $campaign): Response
    {
        Gate::authorize('update', $character);
        $validated = $request->validate(['visibility' => ['sometimes', Rule::enum(Visibility::class)]]);
        abort_unless($campaign->hasMember($character->user), 422, "The character's owner isn't in that campaign.");

        $visibility = isset($validated['visibility'])
            ? Visibility::from($validated['visibility'])
            : null;

        if ($character->campaigns()->whereKey($campaign->id)->exists()) {
            if ($visibility !== null) {
                $character->campaigns()->updateExistingPivot($campaign->id, ['visibility' => $visibility->value]);
            }
        } else {
            $character->campaigns()->attach($campaign->id, [
                'visibility' => ($visibility ?? $character->kind->defaultVisibility())->value,
            ]);
        }

        return response()->noContent();
    }

    /** Takes the character out of the campaign: its owner or that campaign's Storyteller. */
    public function destroy(Request $request, Character $character, Campaign $campaign): Response
    {
        /** @var User $me */
        $me = $request->user();
        abort_unless(Gate::allows('update', $character) || $campaign->isStoryteller($me), 403);

        $character->campaigns()->detach($campaign->id);

        return response()->noContent();
    }
}
