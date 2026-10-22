<?php

use App\Models\Character;
use Illuminate\Database\Migrations\Migration;

/**
 * Angel, 2026-10-22: an Expense that spends nothing says why. Char. Creation is
 * no longer a line kind of its own but an Expense marked `cost: 'creation'`, and
 * an Expense given for free is marked `cost: 'free'`. Converts every ledger:
 *  - `kind: 'creation'` → `kind: 'purchase'` + `cost: 'creation'`;
 *  - an Expense with no milestones and no mark → `cost: 'free'`.
 *
 * And corrects Kaien's ledger after Angel's review the same day:
 *  - removes Racing Hare Method (an upgrade costs nothing; the line only noted it),
 *    the 28/3/26 Arsenal-Summoning Gesture repurchase (one too many) and
 *    Five-Direction Armaments (the Solar mode is free);
 *  - adds the Minor spent on Athletics 4→5 (already on the sheet, so no dot changes);
 *  - rewrites the old descriptions in the format the app logs now.
 * Every step checks before it changes, so running this again changes nothing.
 */
return new class extends Migration
{
    private const KAIEN = '7b910733-97f8-418c-bac1-cbaa1e0cb39e';

    private const REMOVE = [
        '886f2279-9b8d-4999-9f02-6e0b6735febb', // Racing Hare Method (Lightning Speed)
        '57e37ed9-fa58-4003-8d54-74867748bfc5', // Repurchase (Arsenal-Summoning Gesture), 28/3/26
        '6766401c-0d2b-41e4-a675-2358bac14e51', // Five-Direction Armaments (Solar) Arsenal-Summoning Gesture
    ];

    private const ATHLETICS_LINE = 'a7e1b2c3-4d5e-4f60-8a71-0b2c3d4e5f60';

    /** Line id → its description in today's format ("Charm (…)", "… repurchase", "Ability 3→4", "Specialty: Ability (…)"). */
    private const DESCRIPTIONS = [
        'f60e5119-ad7a-4636-94a5-a0ccdea50805' => 'Awareness 1→2',
        '44597185-dc87-4ef7-b254-80f1d3e1bc2b' => 'Awareness 2→3',
        '80bfbdb4-b3ff-4251-95ae-d8e0b36e87c1' => 'War 2→3',
        'a83e2272-a12a-4d2d-b830-462e77b7661c' => 'Charm (Arsenal-Summoning Gesture) repurchase',
        'c82f91c9-62aa-40c8-aa50-bc121ac166bd' => 'Charm (Ox Body Technique) repurchase',
        'afb80d74-82fa-4348-9168-b2f090aeb8c9' => 'Close Combat 4→5',
        'e0206f3c-7540-4cb9-a40b-7de037702fbc' => 'Charm (Ox Body Technique)',
        '13e66a74-8ea2-4cb8-a3c6-07df76b09a1d' => 'Charm (Arsenal-Summoning Gesture)',
        'c78d467a-c3e4-4ac1-98f5-3621331d46eb' => 'Session 16/10/26',
        '99fe8ea2-c55a-42ab-b986-5aa47ec242a1' => 'Athletics 3→4',
        '195a0ef3-d63b-423f-8017-bacc156a9996' => 'Charm (Lightning Speed)',
        'ee8092f8-afdf-42e3-9664-78043d901540' => 'Charm (Endurance of a Thousand Cuts) repurchase',
        '9bacf037-de3d-4e86-bd28-9e4f33e7ac19' => 'Charm (Evocation: Ward of the Sun)',
        'c23863a2-af51-4dd0-a0ea-d1121d11a76f' => 'Stamina 4→5',
        '9162824a-5daa-4167-8f1f-0d70608f8051' => 'Charm (Iron Kettle Body) repurchase',
        'a3b27d83-9708-4d9e-97bd-85ce3be618ac' => 'Embassy 2→3',
        '06bc162f-2923-4542-8ca1-3cea07768db3' => 'Charm (Jade Leaves a Trail)',
        '0e2b0b85-ed07-4f42-a04a-56269cbff96f' => 'Specialty: Physique (Tireless)',
        'f792ab9f-7981-42ae-a8f4-f6b0e9b621e4' => 'Specialty: Close Combat (Unarmed)',
        'd3a4e8b3-f1b2-42e6-8c9b-576eb9ffc2db' => 'Charm ([Presence] Excellency)',
        '7bac9ffa-fc20-4055-b166-6449ccdc0598' => 'Charm (Righteous Lion Spirit)',
        '13892f2c-b0e2-49b5-82d8-2b8546f32b13' => 'Charisma 4→5',
        '406c220c-f633-409a-b951-4fab86b81765' => 'Presence 4→5',
        'b9f25a2d-b1dd-48b3-907a-1d08a4f5c376' => 'Charm ([War] Excellency)',
        '9a57259b-16e2-49d9-925b-3f0423ff39e4' => 'Charm ([Embassy] Excellency)',
        'e68cd84d-aa78-4a6f-98cc-c92fd4bd9ae3' => 'Specialty: Presence (Respect)',
        'f3a475ce-ac39-427b-bdae-2f545eae7cef' => 'Charm (Ox Body Technique) repurchase',
        '67ef06f1-2ffa-4f62-9409-855251918422' => 'Embassy 3→4',
        '19063089-885b-4bd9-8c0e-49ba36b1a4ef' => 'Charm ([Integrity] Excellency)',
        'bfb10678-d99e-4c49-8354-be2e58ceffc4' => 'Charm (Sun King Radiance)',
        '8a8aa50a-57f3-49f9-bb05-9c7633b47fb7' => 'Specialty: Embassy (Loyalty)',
        '0e5b5a6d-6c14-4005-b53a-07397de9e8bc' => 'Charm (Arsenal-Summoning Gesture) repurchase',
        '198282ed-ef8f-4042-aa99-7e557efc1bba' => 'Charm (Heavenly Guardian Defense)',
        'fbe41dab-1aa0-4b1f-ac95-8fe1051c9fee' => 'War 3→4',
        'f31bebda-67cf-47fd-bc87-6256148d49bb' => 'Charm (Evocation: Voice That Holds the Line)',
        '95ef1faf-9d41-43cc-a67e-5e8b6b969904' => 'Charm ([Athletics] Excellency)',
        'd2114603-7bbd-44da-9449-0209ce749557' => 'Charm ([Awareness] Excellency)',
    ];

    public function up(): void
    {
        foreach (Character::query()->cursor() as $character) {
            $data = $character->data;
            if (! is_array($data->milestones ?? null)) {
                continue;
            }
            $before = json_encode($data->milestones);
            $ledger = $data->milestones;
            if ($character->id === self::KAIEN) {
                $ledger = $this->fixKaien($ledger);
            }
            $data->milestones = array_map(fn (mixed $line) => $line instanceof stdClass ? $this->markFree($line) : $line, $ledger);
            if (json_encode($data->milestones) !== $before) {
                $character->data = $data;
                $character->save();
            }
        }
    }

    public function down(): void
    {
        // Left as it is: the front end reads both shapes, and Kaien's corrections are real.
    }

    private function markFree(stdClass $line): stdClass
    {
        if (($line->kind ?? null) === 'creation') {
            $line->kind = 'purchase';
            $line->cost = 'creation';
        }
        $spends = false;
        foreach (['personal', 'exalted', 'minor', 'major'] as $type) {
            $spends = $spends || (is_int($line->{$type} ?? null) && $line->{$type} > 0);
        }
        if (($line->kind ?? null) === 'purchase' && ! isset($line->cost) && ! $spends) {
            $line->cost = 'free';
        }

        return $line;
    }

    /**
     * @param  array<mixed>  $ledger
     * @return list<mixed>
     */
    private function fixKaien(array $ledger): array
    {
        $kept = [];
        $hasAthletics = false;
        foreach ($ledger as $line) {
            $id = $line instanceof stdClass ? ($line->id ?? null) : null;
            if (in_array($id, self::REMOVE, true)) {
                continue;
            }
            if ($line instanceof stdClass && is_string($id) && isset(self::DESCRIPTIONS[$id])) {
                $line->description = self::DESCRIPTIONS[$id];
            }
            $hasAthletics = $hasAthletics || $id === self::ATHLETICS_LINE;
            $kept[] = $line;
        }
        if (! $hasAthletics) {
            $kept[] = (object) [
                'id' => self::ATHLETICS_LINE, 'kind' => 'purchase',
                'personal' => 0, 'exalted' => 0, 'minor' => 1, 'major' => 0,
                'description' => 'Athletics 4→5', 'date' => '2026-10-22',
            ];
        }

        return $kept;
    }
};
