<?php

use App\Models\Charm;
use App\Models\ExaltType;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function writeExport(array $files): string
{
    $dir = sys_get_temp_dir().'/exalted-export-'.uniqid();
    mkdir($dir);
    foreach ($files as $name => $rows) {
        file_put_contents("{$dir}/{$name}.json", json_encode($rows));
    }

    return $dir;
}

function sampleExport(): array
{
    return [
        'charms' => [[
            'id' => '11111111-1111-4111-8111-111111111111',
            'type' => 'Solar', 'name' => 'Sharpshooter\'s Clever Tricks', 'page' => 280,
            'description' => 'Long text.', 'mechanical_key' => null, 'mechanical_description' => null,
            'prerequisite_essence' => 2, 'choice_type' => 'custom', 'target_choice_type' => null,
            'multiselect_cap_basis' => null, 'pick_counts' => [2, 1], 'needs_review' => true,
            'review_action' => 'set_list',
            'created_at' => '2026-06-12T13:51:12.252861+00:00', 'updated_at' => '2026-06-13T10:00:00+02:00',
            'charm_abilities' => [['ability' => 'Ranged Combat'], ['ability' => 'Archery']],
            'charm_modes' => [
                ['id' => '22222222-2222-4222-8222-222222222222', 'label' => 'Second', 'mode_text' => 'B', 'prerequisite_essence' => null,
                    'charm_mode_prerequisite_abilities' => []],
                ['id' => '33333333-3333-4333-8333-333333333333', 'label' => 'Repurchase', 'mode_text' => 'A', 'prerequisite_essence' => 3,
                    'charm_mode_prerequisite_abilities' => [['id' => '44444444-4444-4444-8444-444444444444', 'text' => 'Ranged Combat 4']]],
            ],
            'charm_prerequisite_abilities' => [['id' => '55555555-5555-4555-8555-555555555555', 'text' => 'Ranged Combat 3']],
            'charm_prerequisite_charms' => [['id' => '66666666-6666-4666-8666-666666666666', 'charm_name' => 'Trance of Unhesitating Speed']],
            'charm_choice_options' => [['option' => 'Mode B', 'sort_order' => 1], ['option' => 'Mode A', 'sort_order' => 0]],
            'charm_target_options' => [],
        ]],
        'essence_tiers' => [
            ['id' => '77777777-7777-4777-8777-777777777777', 'charm_id' => null, 'mode_id' => '33333333-3333-4333-8333-333333333333', 'essence_threshold' => 3, 'effect_text' => 'More.'],
        ],
        'exalt_types' => [
            ['id' => '88888888-8888-4888-8888-888888888888', 'name' => 'Dragon-Blooded', 'caste_label' => 'Aspect', 'castes' => ['Air', 'Earth'], 'sort_order' => 1,
                'created_at' => '2026-06-12T13:51:12+00:00', 'updated_at' => '2026-06-12T13:51:12+00:00'],
        ],
    ];
}

it('imports the export so the app reads it back exactly, ids and order kept', function () {
    $this->artisan('exalted:import-content', ['directory' => writeExport(sampleExport())])->assertSuccessful();

    $charms = $this->actingAs(User::factory()->create())->getJson('/api/charms')->assertOk()->json();

    expect($charms)->toHaveCount(1)
        ->and($charms[0])
        ->id->toBe('11111111-1111-4111-8111-111111111111')
        ->pick_counts->toBe([2, 1])
        ->needs_review->toBeTrue()
        ->review_action->toBe('set_list')
        ->charm_abilities->toBe([['ability' => 'Ranged Combat'], ['ability' => 'Archery']])
        ->charm_prerequisite_abilities->toBe([['text' => 'Ranged Combat 3']])
        ->charm_prerequisite_charms->toBe([['charm_name' => 'Trance of Unhesitating Speed']])
        ->charm_choice_options->toBe([['option' => 'Mode A', 'sort_order' => 0], ['option' => 'Mode B', 'sort_order' => 1]])
        ->charm_modes->toBe([
            ['label' => 'Second', 'mode_text' => 'B', 'prerequisite_essence' => null, 'charm_mode_prerequisite_abilities' => []],
            ['label' => 'Repurchase', 'mode_text' => 'A', 'prerequisite_essence' => 3, 'charm_mode_prerequisite_abilities' => [['text' => 'Ranged Combat 4']]],
        ]);

    expect(Charm::first()->created_at->toIso8601String())->toBe('2026-06-12T13:51:12+00:00')
        ->and(Charm::first()->updated_at->toIso8601String())->toBe('2026-06-13T08:00:00+00:00')
        ->and(DB::table('charm_essence_tiers')->value('mode_id'))->toBe('33333333-3333-4333-8333-333333333333')
        ->and(ExaltType::first())->castes->toBe(['Air', 'Earth'])->caste_label->toBe('Aspect');
});

it('replaces existing content rather than adding to it', function () {
    Charm::create(['name' => 'Stale', 'description' => '']);
    ExaltType::create(['name' => 'Stale', 'caste_label' => 'Caste', 'castes' => [], 'sort_order' => 0]);

    $dir = writeExport(sampleExport());
    $this->artisan('exalted:import-content', ['directory' => $dir])->assertSuccessful();
    $this->artisan('exalted:import-content', ['directory' => $dir])->assertSuccessful();

    expect(Charm::pluck('name')->all())->toBe(['Sharpshooter\'s Clever Tricks'])
        ->and(ExaltType::pluck('name')->all())->toBe(['Dragon-Blooded'])
        ->and(DB::table('charm_modes')->count())->toBe(2);
});

it('leaves the database untouched when an export file is missing', function () {
    Charm::create(['name' => 'Keep me', 'description' => '']);
    $files = sampleExport();
    unset($files['exalt_types']);

    expect(fn () => $this->artisan('exalted:import-content', ['directory' => writeExport($files)])->run())
        ->toThrow(RuntimeException::class, 'Missing export file');

    expect(Charm::pluck('name')->all())->toBe(['Keep me']);
});

it('rolls everything back when a row cannot be stored', function () {
    Charm::create(['name' => 'Keep me', 'description' => '']);
    $files = sampleExport();
    $files['essence_tiers'][0]['mode_id'] = '99999999-9999-4999-8999-999999999999'; // no such mode

    expect(fn () => $this->artisan('exalted:import-content', ['directory' => writeExport($files)])->run())
        ->toThrow(QueryException::class);

    expect(Charm::pluck('name')->all())->toBe(['Keep me']);
});
