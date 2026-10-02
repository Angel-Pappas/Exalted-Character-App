<?php

use App\Enums\CharacterKind;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\User;

/**
 * A campaign with a Storyteller and two players, set up through the API.
 *
 * @return array{0: Campaign, 1: User, 2: User, 3: User}
 */
function table(): array
{
    $st = User::factory()->create(['username' => 'storyteller']);
    $a = User::factory()->create(['username' => 'alice']);
    $b = User::factory()->create(['username' => 'bob']);

    $id = test()->actingAs($st)->postJson('/api/campaigns', ['name' => 'Dawn of the Reach'])->assertCreated()->json('id');
    $campaign = Campaign::findOrFail($id);
    foreach (['alice', 'bob'] as $name) {
        test()->actingAs($st)->postJson("/api/campaigns/{$id}/members", ['username' => $name])->assertNoContent();
    }

    return [$campaign, $st, $a, $b];
}

/** A character owned by `$owner`, put into the campaign by its owner. */
function joined(Campaign $campaign, User $owner, string $kind, ?string $visibility = null): Character
{
    $character = Character::factory()->for($owner)->create(['kind' => $kind]);
    test()->actingAs($owner)
        ->putJson("/api/characters/{$character->id}/campaigns/{$campaign->id}", $visibility ? ['visibility' => $visibility] : [])
        ->assertNoContent();

    return $character;
}

describe('running a campaign', function () {
    it('makes whoever creates a campaign its Storyteller and a member', function () {
        $me = User::factory()->create();

        $id = $this->actingAs($me)->postJson('/api/campaigns', ['name' => 'Night Market'])->assertCreated()->json('id');

        $this->actingAs($me)->getJson('/api/campaigns')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $id)
            ->assertJsonPath('0.is_storyteller', true)
            ->assertJsonPath('0.member_count', 1);
    });

    it('does not tie the Storyteller role to the admin role', function () {
        [$campaign, , $alice] = table();
        $admin = User::factory()->admin()->create();

        expect($alice->isAdmin())->toBeFalse();
        $this->actingAs($admin)->getJson("/api/campaigns/{$campaign->id}")->assertForbidden();
        $this->actingAs($admin)->putJson("/api/campaigns/{$campaign->id}", ['name' => 'Mine now'])->assertForbidden();
    });

    it('lists only the campaigns you are in', function () {
        [, , $alice] = table();
        $this->actingAs(User::factory()->create())->getJson('/api/campaigns')->assertOk()->assertJsonCount(0);
        $this->actingAs($alice)->getJson('/api/campaigns')->assertOk()->assertJsonCount(1)->assertJsonPath('0.is_storyteller', false);
    });

    it('keeps non-members out of a campaign entirely', function (string $method, string $uri) {
        [$campaign] = table();
        $uri = str_replace('{c}', $campaign->id, $uri);

        $this->actingAs(User::factory()->create())->json($method, $uri, ['name' => 'x', 'username' => 'alice'])->assertForbidden();
    })->with([
        ['GET', '/api/campaigns/{c}'],
        ['PUT', '/api/campaigns/{c}'],
        ['DELETE', '/api/campaigns/{c}'],
        ['POST', '/api/campaigns/{c}/members'],
    ]);

    it('leaves running the campaign to the Storyteller', function () {
        [$campaign, $st, $alice, $bob] = table();
        $c = $campaign->id;

        $this->actingAs($alice)->putJson("/api/campaigns/{$c}", ['name' => 'Alice wins'])->assertForbidden();
        $this->actingAs($alice)->deleteJson("/api/campaigns/{$c}")->assertForbidden();
        $this->actingAs($alice)->postJson("/api/campaigns/{$c}/members", ['username' => 'someone'])->assertForbidden();
        $this->actingAs($alice)->deleteJson("/api/campaigns/{$c}/members/{$bob->id}")->assertForbidden();
        $this->actingAs($alice)->putJson("/api/campaigns/{$c}/storyteller", ['user_id' => $alice->id])->assertForbidden();

        $this->actingAs($st)->putJson("/api/campaigns/{$c}", ['name' => 'The Reach'])->assertNoContent();
        expect($campaign->refresh()->name)->toBe('The Reach');
    });

    it('adds members by username, once, and refuses unknown names', function () {
        [$campaign, $st] = table();
        User::factory()->create(['username' => 'carol']);

        $this->actingAs($st)->postJson("/api/campaigns/{$campaign->id}/members", ['username' => ' Carol '])->assertNoContent();
        $this->actingAs($st)->postJson("/api/campaigns/{$campaign->id}/members", ['username' => 'carol'])->assertNoContent();
        $this->actingAs($st)->postJson("/api/campaigns/{$campaign->id}/members", ['username' => 'nobody'])->assertStatus(422);

        expect($campaign->members()->count())->toBe(4);
    });

    it('hands the Storyteller role to a member, and only a member', function () {
        [$campaign, $st, $alice] = table();
        $outsider = User::factory()->create();

        $this->actingAs($st)->putJson("/api/campaigns/{$campaign->id}/storyteller", ['user_id' => $outsider->id])->assertStatus(422);
        $this->actingAs($st)->putJson("/api/campaigns/{$campaign->id}/storyteller", ['user_id' => $alice->id])->assertNoContent();

        expect($campaign->refresh()->storyteller_id)->toBe($alice->id)
            ->and($campaign->hasMember($st))->toBeTrue();
        $this->actingAs($st)->putJson("/api/campaigns/{$campaign->id}", ['name' => 'x'])->assertForbidden();
        $this->actingAs($alice)->putJson("/api/campaigns/{$campaign->id}", ['name' => 'x'])->assertNoContent();
    });

    it('lets members leave, takes their characters out, and deletes none', function () {
        [$campaign, , $alice] = table();
        $hero = joined($campaign, $alice, 'pc');

        $this->actingAs($alice)->deleteJson("/api/campaigns/{$campaign->id}/members/{$alice->id}")->assertNoContent();

        expect($campaign->hasMember($alice))->toBeFalse()
            ->and($campaign->characters()->count())->toBe(0)
            ->and(Character::find($hero->id))->not->toBeNull();
    });

    it('lets the Storyteller remove a member, but never removes the Storyteller', function () {
        [$campaign, $st, $alice] = table();

        $this->actingAs($st)->deleteJson("/api/campaigns/{$campaign->id}/members/{$st->id}")->assertStatus(422);
        $this->actingAs($st)->deleteJson("/api/campaigns/{$campaign->id}/members/{$alice->id}")->assertNoContent();

        expect($campaign->hasMember($alice))->toBeFalse()->and($campaign->hasMember($st))->toBeTrue();
    });

    it('deletes a campaign without deleting its characters', function () {
        [$campaign, $st, $alice] = table();
        $hero = joined($campaign, $alice, 'pc');

        $this->actingAs($st)->deleteJson("/api/campaigns/{$campaign->id}")->assertNoContent();

        expect(Campaign::count())->toBe(0)->and(Character::find($hero->id))->not->toBeNull();
    });
});

describe('who can see which sheet', function () {
    it('opens public PCs to the other members, read-only', function () {
        [$campaign, , $alice, $bob] = table();
        $hero = joined($campaign, $alice, 'pc');

        $this->actingAs($bob)->getJson("/api/characters/{$hero->id}")->assertOk();
        $this->actingAs($bob)->putJson("/api/characters/{$hero->id}", ['data' => ['x' => 1]])->assertForbidden();
        $this->actingAs($bob)->deleteJson("/api/characters/{$hero->id}")->assertForbidden();
    });

    it('shows every PC by name, but a private PC sheet only to its owner and the Storyteller', function () {
        [$campaign, $st, $alice, $bob] = table();
        $hero = joined($campaign, $alice, 'pc', 'private');

        $this->actingAs($bob)->getJson("/api/characters/{$hero->id}")->assertForbidden();
        $this->actingAs($st)->getJson("/api/characters/{$hero->id}")->assertOk();
        $this->actingAs($st)->putJson("/api/characters/{$hero->id}", ['data' => ['x' => 1]])->assertForbidden();

        $this->actingAs($bob)->getJson("/api/campaigns/{$campaign->id}")
            ->assertJsonCount(1, 'characters')
            ->assertJsonPath('characters.0.name', $hero->name)
            ->assertJsonPath('characters.0.can_view', false);
    });

    it('keeps private NPCs hidden from players, even by name, but not from the Storyteller', function () {
        [$campaign, $st, $alice, $bob] = table();
        $npc = joined($campaign, $alice, 'npc');

        $this->actingAs($bob)->getJson("/api/campaigns/{$campaign->id}")->assertJsonCount(0, 'characters');
        $this->actingAs($bob)->getJson("/api/characters/{$npc->id}")->assertForbidden();

        $this->actingAs($st)->getJson("/api/campaigns/{$campaign->id}")
            ->assertJsonPath('characters.0.id', $npc->id)
            ->assertJsonPath('characters.0.visibility', 'private')
            ->assertJsonPath('characters.0.can_view', true);
        $this->actingAs($st)->getJson("/api/characters/{$npc->id}")->assertOk();
    });

    it('shows public NPCs to the other members', function () {
        [$campaign, , $alice, $bob] = table();
        $npc = joined($campaign, $alice, 'npc', 'public');

        $this->actingAs($bob)->getJson("/api/campaigns/{$campaign->id}")->assertJsonPath('characters.0.can_view', true);
        $this->actingAs($bob)->getJson("/api/characters/{$npc->id}")->assertOk();
    });

    it('never opens a sheet outside the campaign it is public in', function () {
        [$campaign, , $alice] = table();
        $hero = joined($campaign, $alice, 'pc');

        $this->actingAs(User::factory()->create())->getJson("/api/characters/{$hero->id}")->assertForbidden();
    });

    it('sets visibility per campaign', function () {
        [$first, , $alice, $bob] = table();
        $second = Campaign::create(['name' => 'Second', 'storyteller_id' => $alice->id]);
        $second->members()->attach([$alice->id]);
        $carol = User::factory()->create();
        $second->members()->attach([$carol->id]);

        $hero = joined($first, $alice, 'pc', 'private');
        $this->actingAs($alice)->putJson("/api/characters/{$hero->id}/campaigns/{$second->id}", ['visibility' => 'public'])->assertNoContent();

        $this->actingAs($carol)->getJson("/api/characters/{$hero->id}")->assertOk();
        $this->actingAs($bob)->getJson("/api/characters/{$hero->id}")->assertForbidden();
    });
});

describe("a character's campaigns and options", function () {
    it('starts PCs public and NPCs private when they join a campaign', function () {
        [$campaign, , $alice] = table();
        $hero = joined($campaign, $alice, 'pc');
        $npc = joined($campaign, $alice, 'npc');

        expect($campaign->characters()->whereKey($hero->id)->first()?->getRelation('pivot')->visibility->value)->toBe('public')
            ->and($campaign->characters()->whereKey($npc->id)->first()?->getRelation('pivot')->visibility->value)->toBe('private');
    });

    it('lets a character be in several campaigns and changes visibility in place', function () {
        [$campaign, , $alice] = table();
        $other = Campaign::create(['name' => 'Other', 'storyteller_id' => $alice->id]);
        $other->members()->attach($alice->id);
        $hero = joined($campaign, $alice, 'pc');
        joined($other, $alice, 'pc');
        $this->actingAs($alice)->putJson("/api/characters/{$hero->id}/campaigns/{$other->id}")->assertNoContent();
        $this->actingAs($alice)->putJson("/api/characters/{$hero->id}/campaigns/{$campaign->id}", ['visibility' => 'private'])->assertNoContent();

        $this->actingAs($alice)->getJson("/api/characters/{$hero->id}/campaigns")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $campaign->id, 'joined' => true, 'visibility' => 'private'])
            ->assertJsonFragment(['id' => $other->id, 'joined' => true, 'visibility' => 'public']);
    });

    it('only puts a character into a campaign its owner is in, and only by its owner', function () {
        [$campaign, , $alice, $bob] = table();
        $stranger = Character::factory()->create();
        $hero = Character::factory()->for($alice)->create();

        $this->actingAs($stranger->user)->putJson("/api/characters/{$stranger->id}/campaigns/{$campaign->id}")->assertStatus(422);
        $this->actingAs($bob)->putJson("/api/characters/{$hero->id}/campaigns/{$campaign->id}")->assertForbidden();
        $this->actingAs($bob)->putJson("/api/characters/{$hero->id}/campaigns/{$campaign->id}", ['visibility' => 'public'])->assertForbidden();
    });

    it('lets the owner or the Storyteller take a character out, but no other member', function () {
        [$campaign, $st, $alice, $bob] = table();
        $hero = joined($campaign, $alice, 'pc');
        $other = joined($campaign, $alice, 'pc');

        $this->actingAs($bob)->deleteJson("/api/characters/{$hero->id}/campaigns/{$campaign->id}")->assertForbidden();
        $this->actingAs($st)->deleteJson("/api/characters/{$hero->id}/campaigns/{$campaign->id}")->assertNoContent();
        $this->actingAs($alice)->deleteJson("/api/characters/{$other->id}/campaigns/{$campaign->id}")->assertNoContent();

        expect($campaign->characters()->count())->toBe(0);
    });

    it('creates characters as PCs unless told NPC', function () {
        $me = User::factory()->create();

        $pc = $this->actingAs($me)->postJson('/api/characters', ['name' => 'Ember', 'data' => []])->assertCreated()->json('kind');
        $npc = $this->actingAs($me)->postJson('/api/characters', ['name' => 'Guard', 'kind' => 'npc', 'data' => []])->assertCreated()->json('kind');

        expect($pc)->toBe('pc')->and($npc)->toBe('npc');
    });

    it('lets only the owner rename it and switch PC and NPC', function () {
        [$campaign, $st, $alice] = table();
        $hero = joined($campaign, $alice, 'pc');

        $this->actingAs($st)->putJson("/api/characters/{$hero->id}/settings", ['name' => 'x', 'kind' => 'npc'])->assertForbidden();
        $this->actingAs($alice)->putJson("/api/characters/{$hero->id}/settings", ['name' => 'x', 'kind' => 'dragon'])->assertStatus(422);
        $this->actingAs($alice)->putJson("/api/characters/{$hero->id}/settings", ['name' => 'Kaien', 'kind' => 'npc'])->assertNoContent();

        expect($hero->refresh())->name->toBe('Kaien')->kind->toBe(CharacterKind::Npc);
    });
});

describe('the Circle', function () {
    it("lists the other players' PCs in each campaign — not NPCs, not your own", function () {
        [$campaign, $st, $alice, $bob] = table();
        $mine = joined($campaign, $alice, 'pc');
        joined($campaign, $alice, 'pc');
        $bobs = joined($campaign, $bob, 'pc', 'private');
        joined($campaign, $bob, 'npc', 'public');
        joined($campaign, $st, 'npc');

        $this->actingAs($alice)->getJson("/api/characters/{$mine->id}/circle")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonCount(1, '0.characters')
            ->assertJsonPath('0.characters.0.id', $bobs->id)
            ->assertJsonPath('0.characters.0.owner', 'bob')
            ->assertJsonPath('0.characters.0.can_view', false)
            ->assertJsonPath('0.characters.0.notes', '');
    });

    it('keeps the notes to the owner — not the Storyteller, not admins', function () {
        [$campaign, $st, $alice, $bob] = table();
        $mine = joined($campaign, $alice, 'pc');
        joined($campaign, $bob, 'pc');

        $this->actingAs($st)->getJson("/api/characters/{$mine->id}/circle")->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->getJson("/api/characters/{$mine->id}/circle")->assertForbidden();
        $this->actingAs($bob)->getJson("/api/characters/{$mine->id}/circle")->assertForbidden();
    });

    it('saves notes on a PC in the Circle, and clears them when emptied', function () {
        [$campaign, , $alice, $bob] = table();
        $mine = joined($campaign, $alice, 'pc');
        $bobs = joined($campaign, $bob, 'pc');

        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/circle/{$bobs->id}", ['notes' => 'Owes me a favour'])->assertNoContent();
        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/circle/{$bobs->id}", ['notes' => 'Owes me two favours'])->assertNoContent();
        $this->actingAs($alice)->getJson("/api/characters/{$mine->id}/circle")->assertJsonPath('0.characters.0.notes', 'Owes me two favours');

        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/circle/{$bobs->id}", ['notes' => ''])->assertNoContent();
        $this->actingAs($alice)->getJson("/api/characters/{$mine->id}/circle")->assertJsonPath('0.characters.0.notes', '');
    });

    it('refuses notes on a character outside the Circle', function () {
        [$campaign, , $alice] = table();
        $mine = joined($campaign, $alice, 'pc');
        $stranger = Character::factory()->create();

        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/circle/{$stranger->id}", ['notes' => 'hi'])->assertStatus(422);
    });
});
