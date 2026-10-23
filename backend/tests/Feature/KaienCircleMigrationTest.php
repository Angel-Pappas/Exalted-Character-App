<?php

use App\Models\Character;
use App\Models\WikiPage;

// The 2026-10-23 migration: a "Circle" group in Kaien's People & Places.

function runKaienCircleMigration(): void
{
    $migration = require database_path('migrations/2026_10_23_000003_kaien_circle_group.php');
    $migration->up();
}

it('makes the Circle group with Blaque, Veyra and Solaen, keeping the pages that exist', function () {
    $kaien = Character::factory()->create(['id' => '7b910733-97f8-418c-bac1-cbaa1e0cb39e']);
    $place = WikiPage::create(['character_id' => $kaien->id, 'kind' => 'place', 'name' => 'Greyfalls', 'sections' => []]);
    $blaque = WikiPage::create(['character_id' => $kaien->id, 'kind' => 'person', 'name' => 'Blaque', 'place_id' => $place->id, 'sections' => []]);
    WikiPage::create(['character_id' => $kaien->id, 'kind' => 'person', 'name' => 'solaen', 'sections' => []]);

    runKaienCircleMigration();
    runKaienCircleMigration();

    $wiki = collect($this->actingAs($kaien->user)->getJson("/api/characters/{$kaien->id}/wiki")->assertOk()->json())->keyBy('name');
    $circle = $wiki['Circle'];
    expect($circle['kind'])->toBe('group')
        ->and($wiki)->toHaveCount(5)
        ->and($wiki['Veyra']['kind'])->toBe('person')
        ->and($wiki['Veyra']['place_id'])->toBeNull()
        ->and($wiki['Blaque']['place_id'])->toBe($place->id);
    foreach (['Blaque', 'Veyra', 'solaen'] as $name) {
        expect($wiki[$name]['group_ids'])->toBe([$circle['id']], $name);
    }
    expect($blaque->refresh()->groups()->count())->toBe(1);
});

it('does nothing where Kaien is not in the database', function () {
    runKaienCircleMigration();
    expect(WikiPage::count())->toBe(0);
});
