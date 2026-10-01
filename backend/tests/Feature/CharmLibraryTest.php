<?php

use App\Models\Charm;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function charmPayload(array $overrides = []): array
{
    return [
        'type' => 'Solar',
        'name' => 'Ox-Body Technique',
        'page' => 300,
        'description' => '',
        'mechanical_key' => 'ox_body',
        'mechanical_description' => null,
        'prerequisite_essence' => 1,
        'choice_type' => 'custom',
        'target_choice_type' => null,
        'multiselect_cap_basis' => null,
        'pick_counts' => [2, 1],
        'abilities' => ['Resistance', 'Athletics'],
        'prerequisite_abilities' => ['Resistance 1'],
        'prerequisite_charms' => ['Iron Skin', 'Durability of Oak'],
        'choice_options' => ['Third', 'First', 'Second'],
        'target_options' => [],
        ...$overrides,
    ];
}

it('creates a charm with its lists and returns it in the shape the app reads', function () {
    $admin = User::factory()->admin()->create();

    $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->assertCreated()->json('id');

    $charm = collect($this->actingAs($admin)->getJson('/api/charms')->assertOk()->json())->firstWhere('id', $id);

    expect($charm)
        ->name->toBe('Ox-Body Technique')
        ->description->toBe('')
        ->pick_counts->toBe([2, 1])
        ->needs_review->toBeFalse()
        ->charm_abilities->toBe([['ability' => 'Resistance'], ['ability' => 'Athletics']])
        ->charm_prerequisite_abilities->toBe([['text' => 'Resistance 1']])
        ->charm_prerequisite_charms->toBe([['charm_name' => 'Iron Skin'], ['charm_name' => 'Durability of Oak']])
        ->charm_choice_options->toBe([
            ['option' => 'Third', 'sort_order' => 0],
            ['option' => 'First', 'sort_order' => 1],
            ['option' => 'Second', 'sort_order' => 2],
        ])
        ->charm_target_options->toBe([])
        ->charm_modes->toBe([]);
});

it('replaces the lists on save and leaves modes alone', function () {
    $admin = User::factory()->admin()->create();
    $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->json('id');
    $modeId = (string) str()->uuid();
    DB::table('charm_modes')->insert(['id' => $modeId, 'charm_id' => $id, 'label' => 'Repurchase', 'mode_text' => 'Again', 'prerequisite_essence' => 2, 'position' => 0]);
    DB::table('charm_mode_prerequisite_abilities')->insert(['id' => (string) str()->uuid(), 'mode_id' => $modeId, 'text' => 'Archery 4', 'position' => 0]);

    $this->actingAs($admin)->putJson("/api/charms/{$id}", charmPayload([
        'name' => 'Renamed', 'abilities' => ['Archery'], 'prerequisite_charms' => [], 'choice_options' => ['Only'],
    ]))->assertNoContent();

    $charm = collect($this->actingAs($admin)->getJson('/api/charms')->json())->firstWhere('id', $id);

    expect($charm)
        ->name->toBe('Renamed')
        ->charm_abilities->toBe([['ability' => 'Archery']])
        ->charm_prerequisite_charms->toBe([])
        ->charm_choice_options->toBe([['option' => 'Only', 'sort_order' => 0]])
        ->charm_modes->toBe([[
            'label' => 'Repurchase', 'mode_text' => 'Again', 'prerequisite_essence' => 2,
            'charm_mode_prerequisite_abilities' => [['text' => 'Archery 4']],
        ]]);
});

it('orders charms by type, then page with page-less charms last, then name', function () {
    $admin = User::factory()->admin()->create();
    foreach ([['Solar', null, 'A'], ['Solar', 20, 'Z'], ['Abyssal', 50, 'M'], ['Solar', 20, 'B'], ['Solar', 3, 'Q']] as [$type, $page, $name]) {
        Charm::create(['type' => $type, 'page' => $page, 'name' => $name, 'description' => '']);
    }

    $names = collect($this->actingAs($admin)->getJson('/api/charms')->json())->pluck('name')->all();

    expect($names)->toBe(['M', 'Q', 'B', 'Z', 'A']);
});

it('rejects invalid choice types and duplicate options', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->postJson('/api/charms', charmPayload(['choice_type' => 'bogus']))->assertJsonValidationErrors('choice_type');
    $this->actingAs($admin)->postJson('/api/charms', charmPayload(['choice_options' => ['A', 'A']]))->assertJsonValidationErrors('choice_options.0');
});

it('sets and clears the review flag, and deletes charms with their lists', function () {
    $admin = User::factory()->admin()->create();
    $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->json('id');

    $this->actingAs($admin)->putJson("/api/charms/{$id}/review-action", ['review_action' => 'set_list'])->assertNoContent();
    expect(Charm::find($id)->review_action)->toBe('set_list');
    $this->actingAs($admin)->putJson("/api/charms/{$id}/review-action", ['review_action' => null])->assertNoContent();
    expect(Charm::find($id)->review_action)->toBeNull();

    $this->actingAs($admin)->deleteJson("/api/charms/{$id}")->assertNoContent();
    expect(Charm::count())->toBe(0)
        ->and(DB::table('charm_abilities')->count())->toBe(0)
        ->and(DB::table('charm_choice_options')->count())->toBe(0);
});

it('lets players read the library but not change it', function () {
    $admin = User::factory()->admin()->create();
    $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->json('id');
    $player = User::factory()->create();

    $this->actingAs($player)->getJson('/api/charms')->assertOk()->assertJsonCount(1);
    $this->actingAs($player)->putJson("/api/charms/{$id}", charmPayload())->assertForbidden();
    $this->actingAs($player)->putJson("/api/charms/{$id}/review-action", ['review_action' => null])->assertForbidden();
    $this->actingAs($player)->deleteJson("/api/charms/{$id}")->assertForbidden();
});
