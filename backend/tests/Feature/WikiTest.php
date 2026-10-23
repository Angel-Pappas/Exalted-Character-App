<?php

use App\Models\Character;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/** Creates a page through the API and returns its id. */
function wikiPage(User $owner, Character $character, string $kind, string $name): string
{
    return test()->actingAs($owner)
        ->postJson("/api/characters/{$character->id}/wiki", ['kind' => $kind, 'name' => $name])
        ->assertCreated()->json('id');
}

/**
 * The full save body for a page, with the given changes.
 *
 * @param  array<string, mixed>  $changes
 * @return array<string, mixed>
 */
function wikiSave(string $kind, string $name, array $changes = []): array
{
    return [...['kind' => $kind, 'name' => $name, 'place_id' => null, 'group_ids' => [], 'body' => null, 'sections' => []], ...$changes];
}

describe('People & Places', function () {
    it('keeps the wiki to the character owner — not admins, not anyone else', function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        wikiPage($alice, $mine, 'person', 'Blaque');

        $this->actingAs($alice)->getJson("/api/characters/{$mine->id}/wiki")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Blaque')->assertJsonPath('0.kind', 'person');

        $this->actingAs(User::factory()->admin()->create())->getJson("/api/characters/{$mine->id}/wiki")->assertForbidden();
        $this->actingAs(User::factory()->create())->getJson("/api/characters/{$mine->id}/wiki")->assertForbidden();
        $this->actingAs(User::factory()->create())->postJson("/api/characters/{$mine->id}/wiki", ['kind' => 'person', 'name' => 'X'])->assertForbidden();
    });

    it('saves text, sections, place and groups, and returns the editor JSON exactly', function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        $city = wikiPage($alice, $mine, 'place', 'Nexus');
        $legion = wikiPage($alice, $mine, 'group', '23rd Legion');
        $sol = wikiPage($alice, $mine, 'person', 'Solaen');

        $body = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'attrs' => (object) [], 'content' => [
            ['type' => 'text', 'text' => 'Serves in the '],
            ['type' => 'wikiLink', 'attrs' => ['id' => $legion, 'label' => '23rd Legion']],
        ]]]];
        $sections = [['id' => 's1', 'title' => 'History', 'body' => null]];

        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/wiki/{$sol}", wikiSave('person', 'Solaen', [
            'place_id' => $city, 'group_ids' => [$legion], 'body' => $body, 'sections' => $sections,
        ]))->assertOk();

        $page = collect($this->actingAs($alice)->getJson("/api/characters/{$mine->id}/wiki")->json())->firstWhere('id', $sol);
        expect($page['place_id'])->toBe($city)
            ->and($page['group_ids'])->toBe([$legion])
            ->and($page['sections'])->toBe($sections)
            ->and($page['body']['content'][0]['content'][1]['attrs']['id'])->toBe($legion);
        // `{}` stays an object rather than turning into `[]`.
        $raw = $this->actingAs($alice)->get("/api/characters/{$mine->id}/wiki")->getContent();
        expect($raw)->toContain('"attrs":{}');
    });

    it('keeps names unique in a wiki, ignoring case', function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        wikiPage($alice, $mine, 'person', 'Blaque');

        $this->actingAs($alice)->postJson("/api/characters/{$mine->id}/wiki", ['kind' => 'group', 'name' => ' blaque '])
            ->assertStatus(422)->assertJsonValidationErrors('name');
        // Another character's wiki is separate.
        wikiPage($alice, Character::factory()->for($alice)->create(), 'person', 'Blaque');
    });

    it("only accepts this wiki's places and groups, and never a place inside itself", function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        $realm = wikiPage($alice, $mine, 'place', 'The Realm');
        $city = wikiPage($alice, $mine, 'place', 'Nexus');
        $person = wikiPage($alice, $mine, 'person', 'Maellia');
        $elsewhere = wikiPage($alice, Character::factory()->for($alice)->create(), 'place', 'Elsewhere');
        $url = "/api/characters/{$mine->id}/wiki";

        $this->actingAs($alice)->putJson("{$url}/{$city}", wikiSave('place', 'Nexus', ['place_id' => $realm]))->assertOk();
        $this->actingAs($alice)->putJson("{$url}/{$realm}", wikiSave('place', 'The Realm', ['place_id' => $city]))
            ->assertStatus(422)->assertJsonValidationErrors('place_id');
        $this->actingAs($alice)->putJson("{$url}/{$city}", wikiSave('place', 'Nexus', ['place_id' => $city]))->assertStatus(422);
        $this->actingAs($alice)->putJson("{$url}/{$person}", wikiSave('person', 'Maellia', ['place_id' => $person]))->assertStatus(422);
        $this->actingAs($alice)->putJson("{$url}/{$person}", wikiSave('person', 'Maellia', ['place_id' => $elsewhere]))->assertStatus(422);
        $this->actingAs($alice)->putJson("{$url}/{$person}", wikiSave('person', 'Maellia', ['group_ids' => [$city]]))
            ->assertStatus(422)->assertJsonValidationErrors('group_ids');
    });

    it('clears who is in a place or group when that page stops being one, or is deleted', function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        $city = wikiPage($alice, $mine, 'place', 'Nexus');
        $legion = wikiPage($alice, $mine, 'group', '23rd Legion');
        $sol = wikiPage($alice, $mine, 'person', 'Solaen');
        $url = "/api/characters/{$mine->id}/wiki";
        $this->actingAs($alice)->putJson("{$url}/{$sol}", wikiSave('person', 'Solaen', ['place_id' => $city, 'group_ids' => [$legion]]))->assertOk();

        $this->actingAs($alice)->putJson("{$url}/{$city}", wikiSave('group', 'Nexus'))->assertOk();
        $this->actingAs($alice)->deleteJson("{$url}/{$legion}")->assertNoContent();

        $page = collect($this->actingAs($alice)->getJson($url)->json())->firstWhere('id', $sol);
        expect($page['place_id'])->toBeNull()->and($page['group_ids'])->toBe([]);
    });

    it("refuses a page from another character's wiki", function () {
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        $other = Character::factory()->for($alice)->create();
        $page = wikiPage($alice, $other, 'person', 'Blaque');

        $this->actingAs($alice)->putJson("/api/characters/{$mine->id}/wiki/{$page}", wikiSave('person', 'Blaque'))->assertNotFound();
        $this->actingAs($alice)->deleteJson("/api/characters/{$mine->id}/wiki/{$page}")->assertNotFound();
    });

    it('stores an image privately, replaces it, and removes the files with the page or character', function () {
        Storage::fake('local');
        $alice = User::factory()->create();
        $mine = Character::factory()->for($alice)->create();
        $page = wikiPage($alice, $mine, 'person', 'Blaque');
        $url = "/api/characters/{$mine->id}/wiki/{$page}/image";

        $first = $this->actingAs($alice)->post($url, ['image' => UploadedFile::fake()->image('a.jpg', 40, 40)], ['Accept' => 'application/json'])
            ->assertOk()->json('image');
        expect($first)->toStartWith($url);
        $this->actingAs($alice)->get($url)->assertOk();
        $this->actingAs(User::factory()->admin()->create())->get($url, ['Accept' => 'application/json'])->assertForbidden();

        $second = $this->actingAs($alice)->post($url, ['image' => UploadedFile::fake()->image('b.png', 40, 40)], ['Accept' => 'application/json'])
            ->assertOk()->json('image');
        expect($second)->not->toBe($first)
            ->and(Storage::disk('local')->allFiles("wiki/{$mine->id}"))->toHaveCount(1);

        $this->actingAs($alice)->post($url, ['image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422);
        $this->actingAs($alice)->post($url, ['image' => UploadedFile::fake()->image('big.jpg')->size(3000)], ['Accept' => 'application/json'])
            ->assertStatus(422);

        $this->actingAs($alice)->deleteJson($url)->assertOk()->assertJsonPath('image', null);
        expect(Storage::disk('local')->allFiles("wiki/{$mine->id}"))->toBe([]);

        $this->actingAs($alice)->post($url, ['image' => UploadedFile::fake()->image('c.jpg', 40, 40)], ['Accept' => 'application/json'])->assertOk();
        $this->actingAs($alice)->deleteJson("/api/characters/{$mine->id}")->assertNoContent();
        expect(Storage::disk('local')->allFiles("wiki/{$mine->id}"))->toBe([]);
    });

    it("removes a deleted account's wiki images", function () {
        Storage::fake('local');
        $bob = User::factory()->create();
        $his = Character::factory()->for($bob)->create();
        $page = wikiPage($bob, $his, 'place', 'Nexus');
        $this->actingAs($bob)->post("/api/characters/{$his->id}/wiki/{$page}/image", ['image' => UploadedFile::fake()->image('a.jpg', 40, 40)], ['Accept' => 'application/json'])->assertOk();

        $this->actingAs(User::factory()->admin()->create())->deleteJson("/api/admin/users/{$bob->id}")->assertNoContent();
        expect(Storage::disk('local')->allFiles("wiki/{$his->id}"))->toBe([]);
    });
});
