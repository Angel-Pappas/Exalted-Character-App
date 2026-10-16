<?php

use App\Models\Character;
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
        'summary' => 'Extra health levels.',
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
        ->summary->toBe('Extra health levels.')
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

it('saves an emptied summary as none, so the card falls back to the description', function () {
    $admin = User::factory()->admin()->create();
    $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->json('id');

    $this->actingAs($admin)->putJson("/api/charms/{$id}", charmPayload(['summary' => '']))->assertNoContent();

    expect(Charm::query()->findOrFail($id)->summary)->toBeNull();
});

it('lets only admins change a summary', function () {
    $player = User::factory()->create();
    $charm = Charm::query()->create(['name' => 'Iron Skin', 'description' => '']);

    $this->actingAs($player)->putJson("/api/charms/{$charm->id}", charmPayload(['summary' => 'Hacked']))->assertForbidden();

    expect($charm->refresh()->summary)->toBeNull();
});

it('fills empty library summaries but never overwrites one written in Admin', function () {
    $empty = Charm::query()->create(['name' => 'Perfect Shadow Stillness', 'description' => '']);
    $edited = Charm::query()->create(['name' => 'Ten Ox Meditation', 'description' => '', 'summary' => 'Written in Admin.']);
    DB::table('charm_library')->where('id', $empty->id)->update(['id' => '569b8f8b-cfa4-486e-84ca-fead121cf6a6']);
    DB::table('charm_library')->where('id', $edited->id)->update(['id' => '91fbf118-441b-4660-b8a0-dfe683fefe96']);

    (require database_path('migrations/2026_10_16_000003_fill_remaining_charm_summaries.php'))->up();

    expect(Charm::query()->findOrFail('569b8f8b-cfa4-486e-84ca-fead121cf6a6')->summary)
        ->toBe('Double 9s on Stealth to stay unseen (8s if you didn\'t move last turn).')
        ->and(Charm::query()->findOrFail('91fbf118-441b-4660-b8a0-dfe683fefe96')->summary)->toBe('Written in Admin.');
});

describe('how a charm is used on the sheet (Angel, 2026-10-16)', function () {
    it('saves commit dots, the in-use icon and the purchase limit, and returns them', function () {
        $admin = User::factory()->admin()->create();
        $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload([
            'commit_motes' => 2, 'commit_needs_repurchase' => true, 'ongoing' => true, 'purchase_limit' => 'essence',
        ]))->assertCreated()->json('id');

        $charm = collect($this->actingAs($admin)->getJson('/api/charms')->json())->firstWhere('id', $id);

        expect($charm)
            ->commit_motes->toBe(2)
            ->commit_needs_repurchase->toBeTrue()
            ->ongoing->toBeTrue()
            ->purchase_limit->toBe('essence');
    });

    it('defaults to no dots, no icon and no limit', function () {
        $admin = User::factory()->admin()->create();
        $id = $this->actingAs($admin)->postJson('/api/charms', charmPayload())->json('id');

        expect(Charm::query()->findOrFail($id))
            ->commit_motes->toBe(0)
            ->ongoing->toBeFalse()
            ->purchase_limit->toBeNull();
    });

    it('takes a number or a trait name as the limit, nothing else', function (string $limit, bool $ok) {
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)->postJson('/api/charms', charmPayload(['purchase_limit' => $limit]));

        $ok ? $response->assertCreated() : $response->assertUnprocessable();
    })->with([
        ['3', true], ['physique', true], ['close combat', true], ['0', false], ['3; drop', false],
    ]);

    it('records Arsenal-Summoning Gesture\'s Dawn mode as a third purchase, once', function () {
        $arsenal = Charm::query()->create(['name' => 'Arsenal-Summoning Gesture', 'description' => '', 'choice_type' => 'custom']);
        DB::table('charm_choice_options')->insert([
            ['charm_id' => $arsenal->id, 'option' => 'Weapons', 'sort_order' => 0],
            ['charm_id' => $arsenal->id, 'option' => 'Armor', 'sort_order' => 1],
        ]);
        $kaien = Character::factory()->create(['data' => (object) ['sheet' => (object) ['charms' => [
            (object) ['id' => 'c', 'libraryId' => $arsenal->id, 'name' => 'Arsenal-Summoning Gesture', 'count' => 2, 'picks' => ['Weapons', 'Armor']],
        ]]]]);
        DB::table('characters')->where('id', $kaien->id)->update(['id' => '7b910733-97f8-418c-bac1-cbaa1e0cb39e']);

        $migration = require database_path('migrations/2026_10_16_000021_arsenal_dawn_mode_purchase.php');
        $migration->up();
        $migration->up();

        $charm = Character::query()->findOrFail('7b910733-97f8-418c-bac1-cbaa1e0cb39e')->data->sheet->charms[0];
        expect($charm->count)->toBe(3)
            ->and($charm->picks)->toBe(['Weapons', 'Armor', 'Perfected Panoply Selection'])
            ->and(DB::table('charm_choice_options')->where('charm_id', $arsenal->id)->orderBy('sort_order')->pluck('option')->all())
            ->toBe(['Weapons', 'Armor', 'Perfected Panoply Selection']);
    });
});
