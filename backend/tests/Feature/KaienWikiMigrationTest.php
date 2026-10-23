<?php

use App\Models\Character;
use App\Models\WikiPage;

// The 2026-10-23 migration: the first pages of Kaien's People & Places.

const KAIEN_ID = '7b910733-97f8-418c-bac1-cbaa1e0cb39e';

function runKaienWikiMigration(): void
{
    $migration = require database_path('migrations/2026_10_23_000002_kaien_people_and_places.php');
    $migration->up();
}

/** @return array<string, mixed> Kaien's wiki as the API returns it, keyed by name */
function kaienWiki(Character $kaien): array
{
    return collect(test()->actingAs($kaien->user)->getJson("/api/characters/{$kaien->id}/wiki")->assertOk()->json())
        ->keyBy('name')->all();
}

it('adds the places, people and entourage, with who is where', function () {
    $kaien = Character::factory()->create(['id' => KAIEN_ID]);
    runKaienWikiMigration();
    $wiki = kaienWiki($kaien);

    expect($wiki)->toHaveCount(3 + 1 + 1 + 6 + 3 + 18)
        ->and($wiki['Port Calin']['kind'])->toBe('place')
        ->and($wiki['Kaien']['place_id'])->toBeNull();

    $dovestone = $wiki['Dovestone']['id'];
    $greyfalls = $wiki['Greyfalls']['id'];
    $entourage = $wiki["Kaien's Entourage"]['id'];
    foreach (['Damos Red-Hand', 'Iria Ten-Marks', 'Ravela Stonecot', 'Cato Meren', 'Thessa Meren', 'Garin Vos', 'Solaen', 'Marek', 'Jorel'] as $name) {
        expect($wiki[$name]['place_id'])->toBe($dovestone, $name);
    }
    foreach (['Oren Varkas', 'Jorin Ashvale', 'Blaque', 'Ral', 'Maelia', 'Avaros', 'Ilyatha', 'Seset'] as $name) {
        expect($wiki[$name]['place_id'])->toBe($greyfalls, $name);
    }
    $members = collect($wiki)->filter(fn (array $p) => in_array($entourage, $p['group_ids'], true));
    expect($members)->toHaveCount(18)->and($members->has('Blaque'))->toBeFalse();
});

it("writes each member's role, age and text, linking the first mention of other pages", function () {
    $kaien = Character::factory()->create(['id' => KAIEN_ID]);
    runKaienWikiMigration();
    $wiki = kaienWiki($kaien);

    $links = fn (string $name) => collect($wiki[$name]['body']['content'])->flatMap(fn ($p) => $p['content'])
        ->where('type', 'wikiLink')->map(fn ($n) => [$n['attrs']['label'], $n['attrs']['id']])->values()->all();

    // Mina's role links her father; "Kaien" is linked once though it appears again.
    expect($links('Oren Varkas'))->toBe([['Kaien', $wiki['Kaien']['id']]])
        ->and($links('Mina Varkas'))->toBe([['Oren Varkas', $wiki['Oren Varkas']['id']]])
        ->and($links('Melio Sar'))->toBe([['Maelia', $wiki['Maelia']['id']], ['Marek', $wiki['Marek']['id']]])
        ->and($links('Jorin Ashvale'))->toBe([['Kaien', $wiki['Kaien']['id']], ['Dovestone', $wiki['Dovestone']['id']]])
        // Veyra has no page: a red link, found by name once she gets one.
        ->and($links('Lenna of the South Orchard'))->toBe([['Veyra', null]]);

    $first = $wiki['Cato Meren']['body']['content'][0]['content'];
    expect($first[0])->toBe(['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Role:'])
        ->and(collect($first)->pluck('text')->implode(''))->toBe('Role: Young swordsman · Age: 19');
    // A link reads as the word in the text ("Oren"), unless that was a misspelling.
    $role = collect($wiki['Mina Varkas']['body']['content'][0]['content'])->firstWhere('type', 'wikiLink');
    expect($role['attrs']['text'])->toBe('Oren')
        ->and(collect($wiki['Melio Sar']['body']['content'][2]['content'])->where('type', 'wikiLink')->last()['attrs']['text'])->toBeNull();
    expect($wiki['Pellios “Pell” Anvar']['body']['content'][1]['content'][0]['text'])
        ->toBe('Nervous but gifted with horses, mules, dogs, and birds. Far braver around animals than people.');
});

it('leaves pages that already exist as they are, and changes nothing when run again', function () {
    $kaien = Character::factory()->create(['id' => KAIEN_ID]);
    $mine = WikiPage::create(['character_id' => KAIEN_ID, 'kind' => 'person', 'name' => 'blaque', 'sections' => [], 'body' => ['type' => 'doc']]);

    runKaienWikiMigration();
    runKaienWikiMigration();
    $wiki = kaienWiki($kaien);

    expect($wiki)->toHaveCount(32)
        ->and($wiki['blaque']['place_id'])->toBeNull()
        ->and($wiki['blaque']['body'])->toBe(['type' => 'doc'])
        ->and($wiki['Kessa Bright-Eyes']['body']['content'][2]['content'][2]['attrs']['id'])->toBe($mine->id);
});

it('does nothing where Kaien is not in the database', function () {
    runKaienWikiMigration();
    expect(WikiPage::count())->toBe(0);
});
