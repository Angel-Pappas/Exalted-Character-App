<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Character;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Admin → Users: every character, and moving one to another user. */
class CharacterController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Character::query()->get(['id', 'name', 'user_id', 'data']));
    }

    public function move(Request $request, Character $character): Response
    {
        $validated = $request->validate(['user_id' => ['required', 'uuid', 'exists:users,id']]);

        $character->update($validated);

        return response()->noContent();
    }
}
