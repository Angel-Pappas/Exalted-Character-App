<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin → Users. The failsafes are enforced here, not only in the UI: nobody
 * can change their own role or delete themselves. Only admins reach these
 * routes, so the admin making a change always remains — which is what keeps
 * the last admin from ever being demoted or deleted.
 */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()->orderBy('username')->get()->map(fn (User $user) => [
            'user_id' => $user->id,
            'username' => $user->username,
            'display_name' => $user->display_name,
            'role' => $user->role->value,
        ]);

        return response()->json($users);
    }

    public function updateRole(Request $request, User $user): Response
    {
        $validated = $request->validate(['role' => ['required', Rule::enum(Role::class)]]);
        $role = Role::from($validated['role']);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['role' => 'You cannot change your own role.']);
        }

        $user->update(['role' => $role]);

        return response()->noContent();
    }

    public function destroy(Request $request, User $user): Response
    {
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => 'You cannot delete your own account.']);
        }

        $user->delete();

        return response()->noContent();
    }
}
