<?php

use App\Enums\Role;
use App\Models\Character;
use App\Models\User;

it('keeps every admin endpoint away from players', function (string $method, string $uri) {
    $player = User::factory()->create();
    $target = User::factory()->create();
    $character = Character::factory()->create();

    $uri = str_replace(['{user}', '{character}'], [$target->id, $character->id], $uri);

    $this->actingAs($player)->json($method, $uri, ['role' => 'admin', 'user_id' => $player->id])->assertForbidden();
})->with([
    ['GET', '/api/admin/users'],
    ['PUT', '/api/admin/users/{user}/role'],
    ['DELETE', '/api/admin/users/{user}'],
    ['GET', '/api/admin/characters'],
    ['PUT', '/api/admin/characters/{character}/owner'],
    ['POST', '/api/exalt-types'],
    ['POST', '/api/charms'],
]);

it('gives a player no way to make themselves admin', function () {
    $player = User::factory()->create();

    $this->actingAs($player)->putJson("/api/admin/users/{$player->id}/role", ['role' => 'admin'])->assertForbidden();
    $this->actingAs($player)->putJson('/api/me/username', ['username' => 'sneaky', 'role' => 'admin'])->assertOk();

    expect($player->refresh()->role)->toBe(Role::Player);
});

it('lists users and all characters for admins', function () {
    $admin = User::factory()->admin()->create(['username' => 'angel']);
    Character::factory()->count(2)->create();

    $this->actingAs($admin)->getJson('/api/admin/users')
        ->assertOk()
        ->assertJsonCount(3)
        ->assertJsonFragment(['user_id' => $admin->id, 'username' => 'angel', 'role' => 'admin', 'display_name' => null]);

    $this->actingAs($admin)->getJson('/api/admin/characters')->assertOk()->assertJsonCount(2);
});

it('changes another user\'s role', function () {
    $admin = User::factory()->admin()->create();
    $player = User::factory()->create();

    $this->actingAs($admin)->putJson("/api/admin/users/{$player->id}/role", ['role' => 'admin'])->assertNoContent();
    expect($player->refresh()->role)->toBe(Role::Admin);

    $this->actingAs($admin)->putJson("/api/admin/users/{$player->id}/role", ['role' => 'player'])->assertNoContent();
    expect($player->refresh()->role)->toBe(Role::Player);
});

it('refuses to change your own role', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();

    $this->actingAs($admin)->putJson("/api/admin/users/{$admin->id}/role", ['role' => 'player'])
        ->assertJsonValidationErrors('role');
});

it('always leaves at least one admin', function () {
    // Only admins change roles and nobody can change their own, so the admin
    // making a change always remains one — even when they are the only admin.
    $onlyAdmin = User::factory()->admin()->create();

    $this->actingAs($onlyAdmin)->putJson("/api/admin/users/{$onlyAdmin->id}/role", ['role' => 'player'])
        ->assertJsonValidationErrors('role');
    $this->actingAs($onlyAdmin)->deleteJson("/api/admin/users/{$onlyAdmin->id}")
        ->assertJsonValidationErrors('user');

    expect(User::where('role', Role::Admin)->count())->toBe(1);
});

it('deletes a user with their characters, but not yourself', function () {
    $admin = User::factory()->admin()->create();
    $player = User::factory()->create();
    Character::factory()->for($player)->create();

    $this->actingAs($admin)->deleteJson("/api/admin/users/{$admin->id}")->assertJsonValidationErrors('user');
    $this->actingAs($admin)->deleteJson("/api/admin/users/{$player->id}")->assertNoContent();

    expect(User::find($player->id))->toBeNull()
        ->and(Character::count())->toBe(0);
});

it('moves a character to another user', function () {
    $admin = User::factory()->admin()->create();
    $to = User::factory()->create();
    $character = Character::factory()->create();

    $this->actingAs($admin)->putJson("/api/admin/characters/{$character->id}/owner", ['user_id' => 'not-a-user'])
        ->assertJsonValidationErrors('user_id');
    $this->actingAs($admin)->putJson("/api/admin/characters/{$character->id}/owner", ['user_id' => $to->id])
        ->assertNoContent();

    expect($character->refresh()->user_id)->toBe($to->id);
});
