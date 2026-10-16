<?php

use App\Models\Campaign;
use App\Models\Character;
use App\Models\User;

/**
 * A ledger with three trainings (Ox Body, Excellent Strike, Awareness 3) plus
 * an Expense logged before training existed and an Income line.
 *
 * @return array<int, object>
 */
function ledgerWithTrainings(): array
{
    return [
        (object) ['id' => 'old', 'kind' => 'purchase', 'personal' => 1, 'exalted' => 0, 'minor' => 0, 'major' => 0, 'description' => 'Bought before training existed', 'date' => '2026-09-01'],
        (object) ['id' => 'strike', 'kind' => 'purchase', 'personal' => 0, 'exalted' => 2, 'minor' => 0, 'major' => 0, 'description' => 'Excellent Strike', 'date' => '2026-10-14', 'training' => true],
        (object) ['id' => 'pay', 'kind' => 'gain', 'personal' => 3, 'exalted' => 0, 'minor' => 0, 'major' => 0, 'description' => 'Session', 'date' => '2026-10-01'],
        (object) ['id' => 'ox', 'kind' => 'purchase', 'personal' => 0, 'exalted' => 4, 'minor' => 0, 'major' => 0, 'description' => 'Ox Body Technique', 'date' => '2026-10-02', 'training' => true],
        (object) ['id' => 'aware', 'kind' => 'purchase', 'personal' => 2, 'exalted' => 0, 'minor' => 0, 'major' => 0, 'description' => 'Awareness 3', 'date' => '2026-10-05', 'training' => true],
    ];
}

/**
 * A campaign run by `storyteller`, with alice's PC (holding the trainings) and
 * bob as another member.
 *
 * @return array{0: Campaign, 1: User, 2: User, 3: User, 4: Character}
 */
function trainingTable(): array
{
    $st = User::factory()->create(['username' => 'storyteller']);
    $alice = User::factory()->create(['username' => 'alice']);
    $bob = User::factory()->create(['username' => 'bob']);

    $id = test()->actingAs($st)->postJson('/api/campaigns', ['name' => 'Dawn of the Reach'])->assertCreated()->json('id');
    foreach (['alice', 'bob'] as $name) {
        test()->actingAs($st)->postJson("/api/campaigns/{$id}/members", ['username' => $name])->assertNoContent();
    }

    $kaien = Character::factory()->for($alice)->create([
        'name' => 'Kaien',
        'data' => (object) ['sheet' => (object) [], 'milestones' => ledgerWithTrainings()],
    ]);
    test()->actingAs($alice)->putJson("/api/characters/{$kaien->id}/campaigns/{$id}")->assertNoContent();

    return [Campaign::findOrFail($id), $st, $alice, $bob, $kaien];
}

describe('marking training done', function () {
    it('lets the owner mark a training done, dated today, and put it back', function () {
        [, , $alice, , $kaien] = trainingTable();
        $this->travelTo('2026-10-16 12:00:00');

        $this->actingAs($alice)->getJson("/api/characters/{$kaien->id}/training")->assertOk()->assertExactJson([]);
        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();
        $this->actingAs($alice)->getJson("/api/characters/{$kaien->id}/training")->assertExactJson(['ox' => '2026-10-16']);

        $this->actingAs($alice)->deleteJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();
        $this->actingAs($alice)->getJson("/api/characters/{$kaien->id}/training")->assertExactJson([]);
    });

    it('keeps the first day when a training is marked done twice', function () {
        [, , $alice, , $kaien] = trainingTable();
        $this->travelTo('2026-10-16 12:00:00');
        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();
        $this->travelTo('2026-10-20 12:00:00');
        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();

        $this->actingAs($alice)->getJson("/api/characters/{$kaien->id}/training")->assertExactJson(['ox' => '2026-10-16']);
    });

    it("lets the campaign's Storyteller mark it done, but still not edit the sheet", function () {
        [, $st, , , $kaien] = trainingTable();

        $this->actingAs($st)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();
        $this->actingAs($st)->getJson("/api/characters/{$kaien->id}/training")->assertOk()->assertJsonStructure(['ox']);
        $this->actingAs($st)->putJson("/api/characters/{$kaien->id}", ['data' => ['sheet' => []]])->assertForbidden();
    });

    it('lets admins mark it done', function () {
        [, , , , $kaien] = trainingTable();

        $this->actingAs(User::factory()->admin()->create())->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();
    });

    it('keeps other players and strangers from marking it', function (string $method) {
        [, , , $bob, $kaien] = trainingTable();
        $uri = "/api/characters/{$kaien->id}/training/ox";

        $this->actingAs($bob)->json($method, $uri)->assertForbidden();
        $this->actingAs(User::factory()->create())->json($method, $uri)->assertForbidden();
    })->with(['PUT', 'DELETE']);

    it('shows what is done to whoever may open the sheet, and no one else', function () {
        [$campaign, , $alice, $bob, $kaien] = trainingTable();
        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();

        $this->actingAs($bob)->getJson("/api/characters/{$kaien->id}/training")->assertOk()->assertJsonStructure(['ox']);
        $this->actingAs(User::factory()->create())->getJson("/api/characters/{$kaien->id}/training")->assertForbidden();

        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/campaigns/{$campaign->id}", ['visibility' => 'private'])->assertNoContent();
        $this->actingAs($bob)->getJson("/api/characters/{$kaien->id}/training")->assertForbidden();
    });

    it('stops being Storyteller business once the character leaves the campaign', function () {
        [$campaign, $st, $alice, , $kaien] = trainingTable();
        $this->actingAs($alice)->deleteJson("/api/characters/{$kaien->id}/campaigns/{$campaign->id}")->assertNoContent();

        $this->actingAs($st)->putJson("/api/characters/{$kaien->id}/training/ox")->assertForbidden();
    });

    it('refuses lines that are not trainings', function (string $entry) {
        [, , $alice, , $kaien] = trainingTable();

        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/{$entry}")->assertUnprocessable();
    })->with([
        'an Expense from before training existed' => 'old',
        'an Income line' => 'pay',
        'a line not in the ledger' => 'nope',
    ]);

    it("survives the owner's next sheet save", function () {
        [, $st, $alice, , $kaien] = trainingTable();
        $this->actingAs($st)->putJson("/api/characters/{$kaien->id}/training/ox")->assertNoContent();

        $this->actingAs($alice)
            ->putJson("/api/characters/{$kaien->id}", ['data' => ['sheet' => [], 'milestones' => ledgerWithTrainings()]])
            ->assertNoContent();

        $this->actingAs($alice)->getJson("/api/characters/{$kaien->id}/training")->assertJsonStructure(['ox']);
    });
});

describe("the Storyteller's training list", function () {
    it('lists what is still in training per character, the longest-waiting first', function () {
        [$campaign, $st, $alice, , $kaien] = trainingTable();
        $this->actingAs($alice)->putJson("/api/characters/{$kaien->id}/training/aware")->assertNoContent();

        $this->actingAs($st)->getJson("/api/campaigns/{$campaign->id}")
            ->assertOk()
            ->assertJsonCount(1, 'training')
            ->assertJsonPath('training.0.character_name', 'Kaien')
            ->assertJsonPath('training.0.owner', 'alice')
            ->assertJsonPath('training.0.entries.*.id', ['ox', 'strike'])
            ->assertJsonPath('training.0.entries.0.exalted', 4)
            ->assertJsonPath('training.0.entries.0.date', '2026-10-02');
    });

    it('drops a character once nothing of theirs is in training', function () {
        [$campaign, $st, , , $kaien] = trainingTable();
        foreach (['ox', 'strike', 'aware'] as $entry) {
            $this->actingAs($st)->putJson("/api/characters/{$kaien->id}/training/{$entry}")->assertNoContent();
        }

        $this->actingAs($st)->getJson("/api/campaigns/{$campaign->id}")->assertJsonCount(0, 'training');
    });

    it('is shown to the Storyteller only', function () {
        [$campaign, , $alice, $bob] = trainingTable();

        $this->actingAs($alice)->getJson("/api/campaigns/{$campaign->id}")->assertJsonCount(0, 'training');
        $this->actingAs($bob)->getJson("/api/campaigns/{$campaign->id}")->assertJsonCount(0, 'training');
    });
});
