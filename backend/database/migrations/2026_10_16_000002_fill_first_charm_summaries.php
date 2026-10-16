<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The first suggested summaries: the 20 charms on Kaien's sheet, drafted from each
 * charm's book text (core effect only; exalt-type modes are in the full text).
 * Only fills a charm whose summary is still empty, so it never overwrites one
 * written in Admin → Charms. A charm missing from the database is skipped.
 */
return new class extends Migration
{
    private const SUMMARIES = [
        '85e414b9-f899-459e-8a5b-b68f43ad3a94' => '1m, Step 3: double extra successes past Defense; ignore penalties on one Close Combat attack.',
        '84bb9dd2-024c-43fa-8072-1851afc2d5ff' => 'Unarmed attacks count as medium or heavy weapons, plus one universal or melee tag.',
        'ad7b387f-d75c-4b88-9438-661d2236c9f9' => 'Double 9s to instill respect, awe or obedience (8s at Iconic anima).',
        'e92d3fbd-e05b-4a59-85cb-2cd95d0ea556' => '1m per question: the ST truthfully answers who is behind a crime, scheme or sudden wealth.',
        'a2bca44e-1d81-40a4-8530-51950568ee25' => 'One Major Intimacy becomes unbreakable by any outside influence.',
        'b58a7dc0-e0d2-4a4b-b17c-ec0a73037af0' => 'Commit 2m: drill noncombatants into a battle group; downtime drilling adds unit benefits.',
        'a26c3069-c67a-4894-a40d-4af54cce599b' => '1m: reflexive rout check for an allied battle group; extra successes add to its next attack.',
        '9393468c-45f9-4c30-9286-d9f5b6a74c8c' => '1m: summon or banish your weapon or armor (2m for both); reflexive within short range.',
        '655fb8f7-5598-4722-b0e1-6ff7b0b8f049' => '1m: double 8s on running, swimming, chases and escapes; +1 Power when moving toward an enemy.',
        '25aa45ad-b8e0-4984-81f9-0b4aa202152f' => '1m, Step 2: clear penalties on your Defense, or reset Hardness after a concentrated attack.',
        '85518bbc-abd5-4151-9f5a-23b39cdc841a' => '1 anima, Step 5: add your wound penalty to Soak for the scene; +1 Power when Soak stops all damage.',
        '8c00f7c9-8af0-44bf-85ee-7a3a58e85841' => '2m, Step 2: roll Attribute + Close Combat and add the successes to your Defense.',
        'ed678e5a-939c-45b2-944f-e9623c02a836' => '1–2m, Step 7: +1 or +2 Soak against this attack; Soak also applies to magical hazards.',
        '0aecc066-05f0-46ce-b01c-465090cef967' => '2m: block a hazard, trap, disease or fall with your Defense instead of rolling to resist.',
        'cf1d3244-c63a-4bfb-b00d-a9a15ca49d57' => 'Commit 1m: your Full Defense also Defends Other for one ally in close range.',
        '1c236e7d-7e35-43c2-ad2c-0c330bcefbba' => '1m: +1 automatic success on War command rolls, or turn an allied group\'s failed rout check into a success.',
        '4c806ed8-b442-428c-bd2d-b103aea92fa7' => 'Commit 1m: gain Power, anima or Will whenever an ally resists enemy social influence.',
        'f1c457e4-9741-4acf-b583-f7c12b3e454e' => '1m per question: the ST truthfully answers questions about the person you are dealing with.',
        'c6c97515-504f-45e4-833c-b72f03801822' => '1m: add the chosen Ability\'s rating as bonus dice to a roll using that Ability.',
        'b2d27db4-c2d1-485f-938c-0a4ddb342a53' => '+1 base Soak (once) and extra health levels with every purchase.',
    ];

    public function up(): void
    {
        foreach (self::SUMMARIES as $id => $summary) {
            DB::table('charm_library')->where('id', $id)->whereNull('summary')->update(['summary' => $summary]);
        }
    }

    // Nothing to undo: rolling back the column migration drops the summaries with it,
    // and clearing them here could wipe summaries edited in Admin since.
    public function down(): void {}
};
