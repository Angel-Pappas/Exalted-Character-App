<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Each user's own editable reference tables (weapons, armor, tags, …). */
class GameDataController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $user->gameData()->first()?->data]);
    }

    public function update(Request $request): Response
    {
        $request->validate(['data' => ['present', 'array']]);

        /** @var User $user */
        $user = $request->user();

        $user->gameData()->updateOrCreate([], ['data' => $this->rawJsonField($request, 'data')]);

        return response()->noContent();
    }
}
