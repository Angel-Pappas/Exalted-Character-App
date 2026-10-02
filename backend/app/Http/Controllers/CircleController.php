<?php

namespace App\Http\Controllers;

use App\Enums\CharacterKind;
use App\Models\Campaign;
use App\Models\CampaignCharacter;
use App\Models\Character;
use App\Models\CircleNote;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * A character's Circle: the other players' PCs in each campaign it is in, with
 * its owner's private notes on each. Only the character's owner sees or edits
 * it — not the Storyteller, not admins, not anyone viewing the sheet.
 */
class CircleController extends Controller
{
    public function show(Request $request, Character $character): JsonResponse
    {
        $me = $this->ownerOnly($request, $character);

        $notes = CircleNote::where('character_id', $character->id)->pluck('notes', 'subject_id');
        $campaigns = $character->campaigns()->with('characters.user')->orderBy('name')->get();

        return response()->json($campaigns->map(fn (Campaign $campaign) => [
            'id' => $campaign->id,
            'name' => $campaign->name,
            'characters' => $campaign->characters
                ->filter(fn (Character $c) => $c->kind === CharacterKind::Pc && $c->user_id !== $character->user_id)
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values()
                ->map(function (Character $c) use ($campaign, $me, $notes) {
                    /** @var CampaignCharacter $place */
                    $place = $c->getRelation('pivot');

                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'owner' => $c->user->username,
                        'can_view' => $campaign->letsSee($me, $c, $place->visibility) || $me->isAdmin(),
                        'notes' => $notes->get($c->id, ''),
                    ];
                }),
        ]));
    }

    /** Saves the owner's notes on another PC that shares a campaign; empty notes are removed. */
    public function update(Request $request, Character $character, Character $subject): Response
    {
        $this->ownerOnly($request, $character);
        $validated = $request->validate(['notes' => ['present', 'nullable', 'string', 'max:65000']]);

        $shared = $subject->kind === CharacterKind::Pc
            && $subject->user_id !== $character->user_id
            && $subject->campaigns()->whereIn('campaigns.id', $character->campaigns()->pluck('campaigns.id'))->exists();
        abort_unless($shared, 422, "That character isn't in this character's Circle.");

        $notes = (string) ($validated['notes'] ?? '');
        $key = ['character_id' => $character->id, 'subject_id' => $subject->id];

        if (trim($notes) === '') {
            CircleNote::where($key)->delete();
        } else {
            CircleNote::upsert([[...$key, 'notes' => $notes, 'created_at' => now(), 'updated_at' => now()]], ['character_id', 'subject_id'], ['notes', 'updated_at']);
        }

        return response()->noContent();
    }

    private function ownerOnly(Request $request, Character $character): User
    {
        /** @var User $me */
        $me = $request->user();
        abort_unless($character->user_id === $me->id, 403);

        return $me;
    }
}
