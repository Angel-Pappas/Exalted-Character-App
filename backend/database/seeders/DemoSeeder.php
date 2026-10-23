<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Character;
use App\Models\User;
use App\Models\WikiPage;
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

        $character = Character::query()->updateOrCreate(
            ['user_id' => $demo->id, 'name' => 'Demo Solar'],
            ['data' => $template->data ?? (object) ['sheet' => (object) []]],
        );

        $this->wiki($character);
    }

    /** A small People & Places wiki for the demo character (replaced on each run). */
    private function wiki(Character $character): void
    {
        WikiPage::where('character_id', $character->id)->delete();
        $make = fn (string $kind, string $name, ?WikiPage $place = null) => WikiPage::create([
            'character_id' => $character->id, 'kind' => $kind, 'name' => $name, 'place_id' => $place?->id, 'sections' => [],
        ]);
        $text = fn (string $t) => ['type' => 'text', 'text' => $t];
        $link = fn (WikiPage $p) => ['type' => 'wikiLink', 'attrs' => ['id' => $p->id, 'label' => $p->name]];
        $doc = fn (array ...$paragraphs) => ['type' => 'doc', 'content' => array_map(fn ($c) => ['type' => 'paragraph', 'content' => $c], $paragraphs)];

        $realm = $make('place', 'The Realm');
        $nexus = $make('place', 'Nexus', $realm);
        $market = $make('place', 'Lower Market', $nexus);
        $entourage = $make('group', 'Entourage');
        $legion = $make('group', '23rd Legion', $nexus);
        $villains = $make('group', 'The Villains', $nexus);
        $solaen = $make('person', 'Solaen', $nexus);
        $blaque = $make('person', 'Blaque', $market);
        $veyra = $make('person', 'Veyra', $market);
        $make('person', 'Maellia', $realm);

        $solaen->groups()->sync([$entourage->id]);
        $blaque->groups()->sync([$entourage->id, $legion->id]);
        $veyra->groups()->sync([$villains->id]);

        $blaque->update([
            'body' => $doc(
                [$text('A former officer of the '), $link($legion), $text(' who put me back on track and helped me find my purpose. He keeps a stall in the '), $link($market), $text(' as cover.')],
                [$text('Close friends with '), $link($solaen), $text('; does not trust '), ['type' => 'wikiLink', 'attrs' => ['id' => 'gone', 'label' => 'Ral']], $text('.')],
            ),
            'sections' => [
                ['id' => 'history', 'title' => 'History', 'body' => $doc([$text('Served twelve years on the Nexus walls before the legion was broken up.')])],
                ['id' => 'secrets', 'title' => 'Secrets', 'body' => $doc([$text('Still sends reports to '), $link($veyra), $text('.')])],
            ],
        ]);
        $nexus->update(['body' => $doc([$text('The great free city, where everything is for sale. Home to the '), $link($legion), $text('.')])]);
    }
}
