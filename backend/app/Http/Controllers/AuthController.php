<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Username + password accounts with cookie sessions. Replaces Supabase Auth.
 */
class AuthController extends Controller
{
    /** Same minimum Supabase enforced, so existing passwords stay valid. */
    public const MIN_PASSWORD_LENGTH = 6;

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->present($request->user())]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $username = self::normalizeUsername($credentials['username']);

        if (! Auth::attempt(['username' => $username, 'password' => $credentials['password']], remember: true)) {
            throw ValidationException::withMessages(['username' => 'Invalid login credentials']);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $this->present(Auth::user())]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->merge(['username' => self::normalizeUsername((string) $request->input('username'))]);

        $validated = $request->validate([
            'username' => self::usernameRules(),
            'password' => ['required', 'string', 'min:'.self::MIN_PASSWORD_LENGTH, 'max:255'],
        ]);

        $user = User::create([...$validated, 'role' => Role::Player]);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return response()->json(['user' => $this->present($user)], 201);
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function updateUsername(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $request->merge(['username' => self::normalizeUsername((string) $request->input('username'))]);

        $validated = $request->validate(['username' => self::usernameRules($user)]);

        $user->update($validated);

        return response()->json(['user' => $this->present($user)]);
    }

    public function updatePassword(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:'.self::MIN_PASSWORD_LENGTH, 'max:255'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Current password is incorrect.']);
        }

        $user->update(['password' => $validated['password']]);

        return response()->noContent();
    }

    /**
     * Usernames are stored lowercase. Accounts carried over from Supabase were
     * stored as `name@exalted.local`; accept that form too.
     */
    public static function normalizeUsername(string $username): string
    {
        $username = strtolower(trim($username));

        return str_ends_with($username, '@exalted.local')
            ? substr($username, 0, -strlen('@exalted.local'))
            : $username;
    }

    /**
     * @return list<mixed>
     */
    private static function usernameRules(?User $ignore = null): array
    {
        return [
            'required', 'string', 'max:64', 'regex:/^[a-z0-9._+-]+$/',
            Rule::unique('users', 'username')->ignore($ignore?->id),
        ];
    }

    /**
     * @return array{id: string, username: string, role: string}|null
     */
    private function present(?User $user): ?array
    {
        return $user === null ? null : [
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role->value,
        ];
    }
}
