<?php

use App\Models\Character;
use Illuminate\Support\Facades\DB;

// The 2026-10-22 migration: Char. Creation and zero-cost Expenses become marked
// Expenses, and Kaien's ledger gets Angel's corrections.

/** @param array<string, mixed> $over */
function ledgerLine(string $id, string $kind, array $over = []): object
{
    return (object) [
        'id' => $id, 'kind' => $kind, 'personal' => 0, 'exalted' => 0, 'minor' => 0, 'major' => 0,
        'description' => $id, 'date' => '', ...$over,
    ];
}

function runLedgerMigration(): void
{
    $migration = require database_path('migrations/2026_10_22_000001_ledger_free_and_creation.php');
    $migration->up();
    $migration->up(); // a second run changes nothing
}

it('marks creation lines and zero-cost expenses on every character, and leaves paid lines alone', function () {
    $character = Character::factory()->create(['data' => (object) ['sheet' => (object) ['foiOriginals' => (object) []], 'milestones' => [
        ledgerLine('cc', 'creation'),
        ledgerLine('gift', 'purchase'),
        ledgerLine('paid', 'purchase', ['exalted' => 1]),
        ledgerLine('income', 'gain', ['minor' => 1]),
    ]]]);

    runLedgerMigration();

    $data = Character::query()->findOrFail($character->id)->data;
    [$cc, $gift, $paid, $income] = $data->milestones;
    expect($cc->kind)->toBe('purchase')->and($cc->cost)->toBe('creation')
        ->and($gift->kind)->toBe('purchase')->and($gift->cost)->toBe('free')
        ->and(isset($paid->cost))->toBeFalse()
        ->and(isset($income->cost))->toBeFalse()
        ->and($data->sheet->foiOriginals)->toEqual((object) []); // the rest of the sheet keeps its shape
});

it("corrects Kaien's ledger: drops three lines, adds the Athletics Minor, rewrites descriptions", function () {
    $kaien = Character::factory()->create(['data' => (object) ['milestones' => [
        ledgerLine('886f2279-9b8d-4999-9f02-6e0b6735febb', 'purchase', ['description' => 'Racing Hare Method (Lightning Speed)']),
        ledgerLine('57e37ed9-fa58-4003-8d54-74867748bfc5', 'purchase', ['personal' => 1]),
        ledgerLine('6766401c-0d2b-41e4-a675-2358bac14e51', 'purchase', ['personal' => 1]),
        ledgerLine('99fe8ea2-c55a-42ab-b986-5aa47ec242a1', 'purchase', ['minor' => 1, 'description' => 'Athletics 4']),
        ledgerLine('0e2b0b85-ed07-4f42-a04a-56269cbff96f', 'purchase', ['personal' => 1, 'description' => 'Specialty Physique [Tireless]']),
    ]]]);
    DB::table('characters')->where('id', $kaien->id)->update(['id' => '7b910733-97f8-418c-bac1-cbaa1e0cb39e']);

    runLedgerMigration();

    $ledger = Character::query()->findOrFail('7b910733-97f8-418c-bac1-cbaa1e0cb39e')->data->milestones;
    expect(array_map(fn (object $l) => [$l->description, $l->minor, $l->personal], $ledger))->toBe([
        ['Athletics 3→4', 1, 0],
        ['Specialty: Physique (Tireless)', 0, 1],
        ['Athletics 4→5', 1, 0],
    ])->and(isset($ledger[2]->training))->toBeFalse(); // the dot is already on the sheet
});
