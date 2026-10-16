<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * How a charm is used on the sheet (Angel, 2026-10-16), set once per charm and
 * true for every character:
 *  - commit_motes: commit dots on its card (0 = none); commit_needs_repurchase
 *    shows them only from the second purchase (Iron Kettle Body commits only
 *    through its repurchase);
 *  - ongoing: an in-use icon on its card;
 *  - purchase_limit: how many times it can be bought — a number, or the name of
 *    a trait whose rating is the limit ("essence", "physique", …); null = no limit.
 * Also gives mechanical keys to the charms whose effects or choices are coded.
 */
return new class extends Migration
{
    /** @var array<string, array{commit_motes?: int, commit_needs_repurchase?: bool, ongoing?: bool, purchase_limit?: string, mechanical_key?: string}> */
    private const SETTINGS = [
        'League of Iron Preparation' => ['commit_motes' => 2, 'ongoing' => true],
        'Iron Kettle Body' => ['commit_motes' => 2, 'commit_needs_repurchase' => true, 'ongoing' => true, 'mechanical_key' => 'iron_kettle'],
        'Evocation: Ward of the Sun' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'ward_of_sun'],
        'Sun King Radiance' => ['commit_motes' => 1, 'ongoing' => true],
        "Unconquered Sun's Sight" => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => 'essence', 'mechanical_key' => 'unconquered_sight'],
        'Endurance of a Thousand Cuts' => ['ongoing' => true, 'mechanical_key' => 'endurance_cuts'],
        'Fists of Iron Technique' => ['ongoing' => true],
        'Righteous Lion Spirit' => ['mechanical_key' => 'righteous_lion'],
        'Ox Body Technique' => ['purchase_limit' => 'physique'],
        'Enhanced Senses' => ['purchase_limit' => 'essence'],
        'Arsenal-Summoning Gesture' => ['purchase_limit' => '3'],
    ];

    public function up(): void
    {
        Schema::table('charm_library', function (Blueprint $table) {
            $table->unsignedTinyInteger('commit_motes')->default(0);
            $table->boolean('commit_needs_repurchase')->default(false);
            $table->boolean('ongoing')->default(false);
            $table->string('purchase_limit', 32)->nullable();
        });

        foreach (self::SETTINGS as $name => $settings) {
            DB::table('charm_library')->where('name', $name)->update($settings);
        }
    }

    public function down(): void
    {
        foreach (self::SETTINGS as $name => $settings) {
            if (isset($settings['mechanical_key'])) {
                DB::table('charm_library')->where('name', $name)->update(['mechanical_key' => null]);
            }
        }
        Schema::table('charm_library', function (Blueprint $table) {
            $table->dropColumn(['commit_motes', 'commit_needs_repurchase', 'ongoing', 'purchase_limit']);
        });
    }
};
