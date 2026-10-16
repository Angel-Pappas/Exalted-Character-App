<?php

use App\Models\Character;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Angel's homebrew (2026-10-16): Arsenal-Summoning Gesture's Dawn mode,
 * Perfected Panoply Selection, is its own purchase of the charm, alongside
 * Weapons and Armor (limit 3). Adds it as a third choice, and records it on
 * Kaien's sheet, which already paid for it in the ledger (Angel's yes, T1).
 * Kaien is changed only while his copy is still at ×2 without it, so running
 * this again changes nothing.
 */
return new class extends Migration
{
    private const OPTION = 'Perfected Panoply Selection';

    private const KAIEN = '7b910733-97f8-418c-bac1-cbaa1e0cb39e';

    public function up(): void
    {
        $arsenal = DB::table('charm_library')->where('name', 'Arsenal-Summoning Gesture')->value('id');
        if ($arsenal === null) {
            return;
        }

        $options = DB::table('charm_choice_options')->where('charm_id', $arsenal);
        if (! (clone $options)->where('option', self::OPTION)->exists()) {
            DB::table('charm_choice_options')->insert([
                'charm_id' => $arsenal,
                'option' => self::OPTION,
                'sort_order' => ((int) (clone $options)->max('sort_order')) + 1,
            ]);
        }

        $kaien = Character::find(self::KAIEN);
        if ($kaien === null) {
            return;
        }
        $data = $kaien->data;
        $sheet = get_object_vars($data)['sheet'] ?? null;
        $charms = is_object($sheet) ? (get_object_vars($sheet)['charms'] ?? []) : [];
        foreach (is_array($charms) ? $charms : [] as $charm) {
            $c = get_object_vars($charm);
            $picks = is_array($c['picks'] ?? null) ? $c['picks'] : [];
            if (($c['libraryId'] ?? null) === $arsenal && ($c['count'] ?? 1) === 2 && ! in_array(self::OPTION, $picks, true)) {
                $charm->count = 3;
                $charm->picks = [...$picks, self::OPTION];
                $kaien->data = $data;
                $kaien->save();
            }
        }
    }

    public function down(): void
    {
        // Kaien's sheet is left as it is: the purchase is real (it is in his ledger).
        $arsenal = DB::table('charm_library')->where('name', 'Arsenal-Summoning Gesture')->value('id');
        DB::table('charm_choice_options')->where('charm_id', $arsenal)->where('option', self::OPTION)->delete();
    }
};
