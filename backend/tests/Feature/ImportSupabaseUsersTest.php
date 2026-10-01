<?php

use App\Enums\Role;
use App\Models\Character;
use App\Models\User;
use Illuminate\Database\QueryException;

function writeUserExport(array $export): string
{
    $path = sys_get_temp_dir().'/exalted-users-'.uniqid().'.json';
    file_put_contents($path, json_encode($export));

    return $path;
}

function sampleUserExport(): array
{
    return [
        'users' => [
            [
                'id' => 'c5d208d8-3d47-4dc3-b76b-c211d8486c3b', 'email' => 'angel@exalted.local',
                // OpenBSD bcrypt test vector in Supabase's $2a$ form; the password is "U*U".
                'encrypted_password' => '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW',
                'created_at' => '2026-06-12T13:51:12.252861+00:00', 'updated_at' => '2026-09-01T10:00:00+00:00',
                'role' => 'admin', 'username' => 'angel', 'display_name' => null,
            ],
            [
                'id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'email' => 'Bob@Exalted.local',
                'encrypted_password' => '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW',
                'created_at' => '2026-06-20T08:00:00+00:00', 'updated_at' => '2026-06-20T08:00:00+00:00',
                'role' => null, 'username' => null, 'display_name' => 'Bobby',
            ],
        ],
        'characters' => [[
            'id' => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'user_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'name' => 'Ember',
            'data' => ['sheet' => ['notes' => '', 'merits' => [], 'bonuses' => new stdClass, 'essence' => 2, 'name' => 'Ïsé / ✦']],
            'created_at' => '2026-07-01T12:00:00+00:00', 'updated_at' => '2026-09-29T21:15:00+00:00',
        ]],
        'game_data' => [[
            'id' => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'user_id' => 'c5d208d8-3d47-4dc3-b76b-c211d8486c3b',
            'data' => ['weapons' => []], 'updated_at' => '2026-07-01T12:00:00+00:00',
        ]],
    ];
}

it('imports accounts that sign in with their old passwords', function () {
    $this->artisan('exalted:import-users', ['file' => writeUserExport(sampleUserExport())])->assertSuccessful();

    $this->postJson('/api/login', ['username' => 'angel', 'password' => 'U*U'])
        ->assertOk()
        ->assertJsonPath('user.id', 'c5d208d8-3d47-4dc3-b76b-c211d8486c3b')
        ->assertJsonPath('user.role', 'admin');

    $bob = User::find('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect($bob)->username->toBe('bob')->role->toBe(Role::Player)->display_name->toBe('Bobby')
        ->and($bob->created_at->toIso8601String())->toBe('2026-06-20T08:00:00+00:00');
});

it('keeps each character with its owner and its sheet exactly as it was', function () {
    $this->artisan('exalted:import-users', ['file' => writeUserExport(sampleUserExport())])->assertSuccessful();
    $bob = User::find('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    $response = $this->actingAs($bob)->getJson('/api/characters/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')->assertOk();

    $sheet = json_decode($response->getContent())->data->sheet;

    expect($sheet->bonuses)->toBeInstanceOf(stdClass::class)->toEqual(new stdClass)
        ->and($sheet->merits)->toBe([])
        ->and($sheet->notes)->toBe('')
        ->and($sheet->essence)->toBe(2)
        ->and($sheet->name)->toBe('Ïsé / ✦');
    expect(Character::first()->updated_at->toIso8601String())->toBe('2026-09-29T21:15:00+00:00');

    $this->actingAs(User::find('c5d208d8-3d47-4dc3-b76b-c211d8486c3b'))->getJson('/api/game-data')
        ->assertExactJson(['data' => ['weapons' => []]]);
});

it('refuses to import over existing accounts', function () {
    User::factory()->create(['username' => 'already-here']);

    expect(fn () => $this->artisan('exalted:import-users', ['file' => writeUserExport(sampleUserExport())])->run())
        ->toThrow(RuntimeException::class, 'not empty');

    expect(User::pluck('username')->all())->toBe(['already-here']);
});

it('imports nothing when any row is bad', function () {
    $export = sampleUserExport();
    $export['characters'][0]['user_id'] = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // no such user

    expect(fn () => $this->artisan('exalted:import-users', ['file' => writeUserExport($export)])->run())
        ->toThrow(QueryException::class);

    expect(User::count())->toBe(0)->and(Character::count())->toBe(0);
});

it('refuses an account without a password hash', function () {
    $export = sampleUserExport();
    $export['users'][1]['encrypted_password'] = '';

    expect(fn () => $this->artisan('exalted:import-users', ['file' => writeUserExport($export)])->run())
        ->toThrow(RuntimeException::class, 'no password hash');
});
