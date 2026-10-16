<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\TrainingCompletion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Trainings: spending milestones (an Expense line flagged `training`) starts
 * one; the owner or the Storyteller of one of its campaigns marks it done,
 * whenever the story says so. See CharacterPolicy::train.
 */
class TrainingController extends Controller
{
    /** The character's finished trainings: entry id → the day it was marked done. */
    public function index(Character $character): JsonResponse
    {
        Gate::authorize('train', $character);

        return response()->json((object) $character->trainingCompletions()
            ->get()
            ->mapWithKeys(fn (TrainingCompletion $done) => [$done->entry_id => $done->completed_on->toDateString()])
            ->all());
    }

    /** Marks a training done today. Marking one already done keeps its first day. */
    public function complete(Request $request, Character $character, string $entry): Response
    {
        $this->authorizeEntry($character, $entry);
        /** @var User $me */
        $me = $request->user();

        TrainingCompletion::firstOrCreate(
            ['character_id' => $character->id, 'entry_id' => $entry],
            ['completed_on' => now()->toDateString(), 'completed_by' => $me->id],
        );

        return response()->noContent();
    }

    /** Puts a training back in progress (marked done by mistake). */
    public function reopen(Character $character, string $entry): Response
    {
        Gate::authorize('train', $character);

        TrainingCompletion::where(['character_id' => $character->id, 'entry_id' => $entry])->delete();

        return response()->noContent();
    }

    private function authorizeEntry(Character $character, string $entry): void
    {
        Gate::authorize('train', $character);

        $isTraining = collect($character->trainingEntries())->contains('id', $entry);
        abort_unless($isTraining, 422, "That isn't a training on this character's sheet.");
    }
}
