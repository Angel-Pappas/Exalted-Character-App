<?php

use App\Models\ExaltType;
use App\Models\User;

it('lists exalt types by sort order then name', function () {
    ExaltType::create(['name' => 'Lunar', 'caste_label' => 'Caste', 'castes' => ['Full Moon'], 'sort_order' => 1]);
    ExaltType::create(['name' => 'Solar', 'caste_label' => 'Caste', 'castes' => ['Dawn', 'Zenith'], 'sort_order' => 0]);
    ExaltType::create(['name' => 'Abyssal', 'caste_label' => 'Caste', 'castes' => [], 'sort_order' => 1]);

    $this->actingAs(User::factory()->create())->getJson('/api/exalt-types')
        ->assertOk()
        ->assertJsonPath('0.name', 'Solar')
        ->assertJsonPath('0.castes', ['Dawn', 'Zenith'])
        ->assertJsonPath('1.name', 'Abyssal')
        ->assertJsonPath('2.name', 'Lunar');
});

it('lets admins add, edit and delete exalt types', function () {
    $admin = User::factory()->admin()->create();

    $id = $this->actingAs($admin)
        ->postJson('/api/exalt-types', ['name' => 'Dragon-Blooded', 'caste_label' => 'Aspect', 'castes' => ['Fire', 'Water'], 'sort_order' => 4])
        ->assertCreated()
        ->assertJsonPath('caste_label', 'Aspect')
        ->assertJsonPath('sort_order', 4)
        ->json('id');

    $this->actingAs($admin)->putJson("/api/exalt-types/{$id}", ['name' => 'Terrestrial', 'caste_label' => 'Aspect', 'castes' => []])->assertNoContent();
    expect(ExaltType::find($id))->name->toBe('Terrestrial')->castes->toBe([]);

    $this->actingAs($admin)->deleteJson("/api/exalt-types/{$id}")->assertNoContent();
    expect(ExaltType::count())->toBe(0);
});

it('keeps players from changing exalt types', function () {
    $type = ExaltType::create(['name' => 'Solar', 'caste_label' => 'Caste', 'castes' => [], 'sort_order' => 0]);
    $player = User::factory()->create();

    $this->actingAs($player)->putJson("/api/exalt-types/{$type->id}", ['name' => 'X', 'caste_label' => 'Caste', 'castes' => []])->assertForbidden();
    $this->actingAs($player)->deleteJson("/api/exalt-types/{$type->id}")->assertForbidden();
});
