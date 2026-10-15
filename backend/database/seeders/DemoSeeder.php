<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Character;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * A demo login for the dev checkout only, so pages can be screenshotted
 * (`npm run shots`) and reviewed before a change ships. Never run it against the
 * live database. Login: demo / password.
 *
 * Unlike the other projects' demo seeders this one never wipes anything: the dev
 * database holds the game content (charms, exalt types), which no migration
 * recreates. It only adds (or refreshes) the `demo` user and its character, whose
 * sheet is a copy of the fullest character already in the dev database.
 *
 *     (cd backend && php artisan db:seed --class=DemoSeeder)
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $demo = User::query()->updateOrCreate(
            ['username' => 'demo'],
            ['password' => Hash::make('password'), 'role' => Role::Admin],
        );

        $template = Character::query()
            ->where('user_id', '!=', $demo->id)
            ->get()
            ->sortByDesc(fn (Character $c) => strlen((string) json_encode($c->data)))
            ->first();

        Character::query()->updateOrCreate(
            ['user_id' => $demo->id, 'name' => 'Demo Solar'],
            ['data' => $template->data ?? (object) ['sheet' => (object) []]],
        );
    }
}
