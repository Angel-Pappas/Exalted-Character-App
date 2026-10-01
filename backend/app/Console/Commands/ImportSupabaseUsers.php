<?php

namespace App\Console\Commands;

use App\Support\SupabasePassword;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use stdClass;

/**
 * One-off move from Supabase: loads the accounts (with their existing password
 * hashes), characters and game data from a single JSON export. IDs are kept,
 * so every character stays with its owner.
 *
 * The export is one object: {"users": [...], "characters": [...], "game_data": [...]}
 * where each user row carries id, email, encrypted_password, created_at,
 * updated_at and the user_profiles columns role, username, display_name.
 *
 * Refuses to run while any account exists, so it can never overwrite real
 * users. Character sheets are copied verbatim and compared after the insert.
 */
#[Signature('exalted:import-users {file : The Supabase JSON export}')]
#[Description('Import the accounts, characters and game data from a Supabase export')]
class ImportSupabaseUsers extends Command
{
    public function handle(): int
    {
        $export = $this->read((string) $this->argument('file'));

        if (DB::table('users')->exists()) {
            throw new RuntimeException('The users table is not empty; refusing to import over existing accounts.');
        }

        $users = array_map($this->userRow(...), $export['users']);
        $characters = array_map(fn (stdClass $c) => [
            'id' => $c->id,
            'user_id' => $c->user_id,
            'name' => $c->name,
            'data' => $this->encode($c->data),
            'created_at' => $this->timestamp($c->created_at),
            'updated_at' => $this->timestamp($c->updated_at),
        ], $export['characters']);
        $gameData = array_map(fn (stdClass $g) => [
            'id' => $g->id,
            'user_id' => $g->user_id,
            'data' => $this->encode($g->data),
            'updated_at' => $this->timestamp($g->updated_at),
        ], $export['game_data']);

        DB::transaction(function () use ($users, $characters, $gameData, $export) {
            DB::table('users')->insert($users);
            DB::table('characters')->insert($characters);
            DB::table('game_data')->insert($gameData);

            foreach (['users' => $users, 'characters' => $characters, 'game_data' => $gameData] as $table => $rows) {
                $count = DB::table($table)->count();
                if ($count !== count($rows)) {
                    throw new RuntimeException("{$table}: expected ".count($rows)." rows, found {$count}.");
                }
            }

            foreach ([...$export['characters'], ...$export['game_data']] as $row) {
                $table = property_exists($row, 'name') ? 'characters' : 'game_data';
                $stored = json_decode((string) DB::table($table)->where('id', $row->id)->value('data'), false);
                if ($this->canonical($stored) !== $this->canonical($row->data)) {
                    throw new RuntimeException("{$table} {$row->id}: stored data differs from the export.");
                }
            }
        });

        $this->table(['Table', 'Rows'], [
            ['users', count($users)], ['characters', count($characters)], ['game_data', count($gameData)],
        ]);
        $this->info('Accounts, characters and game data imported.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, mixed>
     */
    private function userRow(stdClass $user): array
    {
        if (! is_string($user->encrypted_password) || $user->encrypted_password === '') {
            throw new RuntimeException("User {$user->id} has no password hash.");
        }

        $username = $user->username ?? null;
        if (! is_string($username) || $username === '') {
            $username = (string) $user->email;
        }
        $username = strtolower(trim($username));
        if (str_ends_with($username, '@exalted.local')) {
            $username = substr($username, 0, -strlen('@exalted.local'));
        }

        return [
            'id' => $user->id,
            'username' => $username,
            'password' => SupabasePassword::toLaravel($user->encrypted_password),
            'role' => $user->role ?? 'player',
            'display_name' => $user->display_name ?? null,
            'created_at' => $this->timestamp($user->created_at),
            'updated_at' => $this->timestamp($user->updated_at),
        ];
    }

    /**
     * @return array{users: list<stdClass>, characters: list<stdClass>, game_data: list<stdClass>}
     */
    private function read(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("Missing export file: {$path}");
        }

        // Decoded as objects so `{}` and `[]` inside character sheets stay distinct.
        $export = json_decode((string) file_get_contents($path), false, 512, JSON_THROW_ON_ERROR);
        if (! $export instanceof stdClass) {
            throw new RuntimeException('The export is not a JSON object.');
        }

        return [
            'users' => $this->rowsOf($export, 'users'),
            'characters' => $this->rowsOf($export, 'characters'),
            'game_data' => $this->rowsOf($export, 'game_data'),
        ];
    }

    /**
     * @return list<stdClass>
     */
    private function rowsOf(stdClass $export, string $key): array
    {
        $rows = $export->{$key} ?? null;
        if (! is_array($rows) || ! array_is_list($rows)) {
            throw new RuntimeException("The export has no \"{$key}\" list.");
        }

        $checked = [];
        foreach ($rows as $row) {
            if (! $row instanceof stdClass) {
                throw new RuntimeException("Every \"{$key}\" entry must be an object.");
            }
            $checked[] = $row;
        }

        return $checked;
    }

    private function encode(mixed $data): string
    {
        return json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * JSON text with every object's keys sorted, so two decoded values compare
     * equal exactly when they hold the same data (MySQL reorders object keys).
     */
    private function canonical(mixed $value): string
    {
        $sort = function (mixed $v) use (&$sort): mixed {
            if ($v instanceof stdClass) {
                $props = get_object_vars($v);
                ksort($props, SORT_STRING);

                return (object) array_map($sort, $props);
            }

            return is_array($v) ? array_map($sort, $v) : $v;
        };

        return $this->encode($sort($value));
    }

    /** Supabase timestamps carry a UTC offset; MySQL stores them as plain UTC. */
    private function timestamp(?string $value): ?string
    {
        return $value === null ? null : Carbon::parse($value)->utc()->format('Y-m-d H:i:s');
    }
}
