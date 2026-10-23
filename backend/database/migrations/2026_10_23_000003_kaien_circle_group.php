<?php

use App\Models\Character;
use App\Models\WikiPage;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Angel, 2026-10-23: a group "Circle" in Kaien's People & Places with Blaque,
 * Veyra and Solaen. Veyra had no page yet (her links were red), so she gets one,
 * with no place. Adds only; a page that already exists keeps everything it has
 * and only joins the group, so running this again changes nothing.
 */
return new class extends Migration
{
    private const KAIEN = '7b910733-97f8-418c-bac1-cbaa1e0cb39e';

    private const MEMBERS = ['Blaque', 'Veyra', 'Solaen'];

    public function up(): void
    {
        if (! Character::whereKey(self::KAIEN)->exists()) {
            return;
        }

        DB::transaction(function () {
            $circle = $this->page('group', 'Circle');
            foreach (self::MEMBERS as $name) {
                DB::table('wiki_page_groups')->insertOrIgnore(['page_id' => $this->page('person', $name), 'group_id' => $circle]);
            }
        });
    }

    /** The id of the page with that name (any case), made if there is none. */
    private function page(string $kind, string $name): string
    {
        $found = WikiPage::where('character_id', self::KAIEN)->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->value('id');

        return is_string($found) ? $found
            : WikiPage::create(['character_id' => self::KAIEN, 'kind' => $kind, 'name' => $name, 'sections' => []])->id;
    }

    // Adds Angel's group only; there is nothing to undo that he may not have edited since.
    public function down(): void {}
};
