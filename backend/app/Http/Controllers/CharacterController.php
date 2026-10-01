<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CharacterController extends Controller
{
    /** The signed-in user's own characters, newest first. */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($user->characters()->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'data' => ['present', 'array'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $character = $user->characters()->create([
            'name' => $validated['name'],
            'data' => $this->rawJsonField($request, 'data'),
        ]);

        return response()->json($character->refresh(), 201);
    }

    public function show(Character $character): JsonResponse
    {
        Gate::authorize('view', $character);

        return response()->json($character);
    }

    /** Saves the character sheet (the only thing the sheet page edits). */
    public function update(Request $request, Character $character): Response
    {
        Gate::authorize('update', $character);

        $request->validate(['data' => ['present', 'array']]);

        $character->update(['data' => $this->rawJsonField($request, 'data')]);

        return response()->noContent();
    }

    public function destroy(Character $character): Response
    {
        Gate::authorize('delete', $character);

        $character->delete();

        return response()->noContent();
    }
}
