<?php

use App\Enums\Role;
use App\Models\User;
use App\Support\SupabasePassword;

it('reports no user when signed out', function () {
    $this->getJson('/api/me')->assertOk()->assertExactJson(['user' => null]);
});

it('signs up a player and signs them in', function () {
    $this->postJson('/api/register', ['username' => '  Alice ', 'password' => 'secret1'])
        ->assertCreated()
        ->assertJsonPath('user.username', 'alice')
        ->assertJsonPath('user.role', 'player');

    $this->getJson('/api/me')->assertJsonPath('user.username', 'alice');
});

it('never lets sign-up choose a role', function () {
    $this->postJson('/api/register', ['username' => 'mallory', 'password' => 'secret1', 'role' => 'admin'])
        ->assertCreated();

    expect(User::where('username', 'mallory')->first()->role)->toBe(Role::Player);
});

it('rejects taken usernames, bad characters and short passwords', function () {
    User::factory()->create(['username' => 'bob']);

    $this->postJson('/api/register', ['username' => 'BOB', 'password' => 'secret1'])->assertJsonValidationErrors('username');
    $this->postJson('/api/register', ['username' => 'bo b', 'password' => 'secret1'])->assertJsonValidationErrors('username');
    $this->postJson('/api/register', ['username' => 'carol', 'password' => '12345'])->assertJsonValidationErrors('password');
});

it('signs in by username, case-insensitively, or by the old name@exalted.local form', function (string $login) {
    User::factory()->create(['username' => 'angel', 'password' => 'hunter22']);

    $this->postJson('/api/login', ['username' => $login, 'password' => 'hunter22'])
        ->assertOk()
        ->assertJsonPath('user.username', 'angel');
})->with(['angel', 'Angel ', 'angel@exalted.local']);

it('rejects a wrong password', function () {
    User::factory()->create(['username' => 'angel', 'password' => 'hunter22']);

    $this->postJson('/api/login', ['username' => 'angel', 'password' => 'nope'])
        ->assertJsonValidationErrors('username');
    $this->getJson('/api/me')->assertExactJson(['user' => null]);
});

it('keeps passwords carried over from Supabase working', function () {
    // An OpenBSD bcrypt test vector in the $2a$ form Supabase stores ("U*U").
    $supabaseHash = '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW';
    $user = User::factory()->create(['username' => 'old']);
    DB::table('users')->where('id', $user->id)->update(['password' => SupabasePassword::toLaravel($supabaseHash)]);

    $this->postJson('/api/login', ['username' => 'old', 'password' => 'U*V'])->assertJsonValidationErrors('username');
    $this->postJson('/api/login', ['username' => 'old', 'password' => 'U*U'])->assertOk();
});

it('refuses to relabel something that is not a bcrypt hash', function () {
    SupabasePassword::toLaravel('plaintext');
})->throws(InvalidArgumentException::class);

it('signs out', function () {
    $this->actingAs(User::factory()->create())->postJson('/api/logout')->assertNoContent();

    $this->assertGuest('web');
});

it('changes the username, keeping it unique', function () {
    User::factory()->create(['username' => 'taken']);
    $user = User::factory()->create(['username' => 'before']);

    $this->actingAs($user)->putJson('/api/me/username', ['username' => 'taken'])->assertJsonValidationErrors('username');
    $this->actingAs($user)->putJson('/api/me/username', ['username' => 'After'])->assertJsonPath('user.username', 'after');
});

it('changes the password only with the current one', function () {
    $user = User::factory()->create(['password' => 'oldpass']);

    $this->actingAs($user)->putJson('/api/me/password', ['current_password' => 'wrong', 'password' => 'newpass'])
        ->assertJsonValidationErrors('current_password');
    $this->actingAs($user)->putJson('/api/me/password', ['current_password' => 'oldpass', 'password' => 'newpass'])
        ->assertNoContent();

    expect(Hash::check('newpass', $user->refresh()->password))->toBeTrue();
});

it('requires sign-in for everything but me, login and register', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with([
    ['GET', '/api/characters'],
    ['GET', '/api/charms'],
    ['GET', '/api/exalt-types'],
    ['GET', '/api/game-data'],
    ['POST', '/api/logout'],
    ['GET', '/api/admin/users'],
]);
