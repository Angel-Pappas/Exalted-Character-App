<?php

use App\Models\Character;
use App\Models\User;

it('lists only your own characters, newest first', function () {
    $me = User::factory()->create();
    $older = Character::factory()->for($me)->create(['created_at' => now()->subDay()]);
    $newer = Character::factory()->for($me)->create();
    Character::factory()->create();

    $this->actingAs($me)->getJson('/api/characters')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.id', $newer->id)
        ->assertJsonPath('1.id', $older->id);
});

it('creates a character owned by the signed-in user, whatever user_id is sent', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $id = $this->actingAs($me)
        ->postJson('/api/characters', ['name' => 'Ember', 'user_id' => $other->id, 'data' => ['sheet' => ['exaltType' => 'Solar']]])
        ->assertCreated()
        ->assertJsonPath('name', 'Ember')
        ->json('id');

    expect(Character::find($id)->user_id)->toBe($me->id);
});

it('stores the sheet exactly as sent, keeping {} and [] and empty strings', function () {
    $me = User::factory()->create();
    $character = Character::factory()->for($me)->create();
    $sheet = '{"data":{"sheet":{"notes":"","merits":[],"bonuses":{},"nested":{"list":[{"a":""}],"zero":0,"flag":false,"nothing":null}}}}';

    $this->actingAs($me)
        ->call('PUT', "/api/characters/{$character->id}", [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], $sheet)
        ->assertNoContent();

    $returned = $this->actingAs($me)->getJson("/api/characters/{$character->id}")->getContent();

    expect(json_encode(json_decode($returned, false)->data))
        ->toBe(json_encode(json_decode($sheet, false)->data));
});

it("blocks players from other players' characters", function (string $method) {
    $character = Character::factory()->create();

    $this->actingAs(User::factory()->create())
        ->json($method, "/api/characters/{$character->id}", ['data' => []])
        ->assertForbidden();
})->with(['GET', 'PUT', 'DELETE']);

it('lets admins open, save and delete any character', function () {
    $admin = User::factory()->admin()->create();
    $character = Character::factory()->create();

    $this->actingAs($admin)->getJson("/api/characters/{$character->id}")->assertOk();
    $this->actingAs($admin)->putJson("/api/characters/{$character->id}", ['data' => ['x' => 1]])->assertNoContent();
    $this->actingAs($admin)->deleteJson("/api/characters/{$character->id}")->assertNoContent();

    expect(Character::count())->toBe(0);
});

it('round-trips the game data tables per user', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->getJson('/api/game-data')->assertExactJson(['data' => null]);
    $this->actingAs($me)->putJson('/api/game-data', ['data' => ['weapons' => [['name' => 'Daiklave']]]])->assertNoContent();
    $this->actingAs($me)->putJson('/api/game-data', ['data' => ['weapons' => []]])->assertNoContent();

    $this->actingAs($me)->getJson('/api/game-data')->assertExactJson(['data' => ['weapons' => []]]);
    $this->actingAs(User::factory()->create())->getJson('/api/game-data')->assertExactJson(['data' => null]);
});
