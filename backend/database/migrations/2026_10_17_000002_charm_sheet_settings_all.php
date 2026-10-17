<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Every charm in the library reviewed for how it is used on the sheet (Angel,
 * 2026-10-17), by the rules agreed for Kaien's charms on 2026-10-16: commit dots
 * for a charm that commits motes, an in-use icon for an ongoing effect, a
 * purchase limit where the text gives one (a charm with Repurchase modes can be
 * bought once more per mode), purchase choices, and a mechanical key where the
 * sheet computes an effect (src/lib/charmEffects.ts). Commit dots that come with
 * a mode (an Exalt type's mode, an upgrade) are set on that mode. The full list,
 * charm by charm, is info/charm-implementation.md.
 *
 * Kaien's charms keep their 2026-10-16 settings. New for them: Integrity-Protecting
 * Principle gets an in-use icon (it lasts the rest of the scene), Iron Kettle Body
 * and Endurance of a Thousand Cuts a limit of 2 (one Repurchase mode each; he has
 * ×2), and League of Iron Preparation's Infernal mode a dot he can't use.
 */
return new class extends Migration
{
    /** @var array<string, array<string, mixed>> */
    private const CHARMS = [
        'A Drop Amongst the Ocean' => ['commit_motes' => 1, 'ongoing' => true],
        'Acquainted with Deception' => ['commit_motes' => 1, 'ongoing' => true],
        'Adder Fang Method' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Air Dragon Form' => ['commit_motes' => 1, 'ongoing' => true],
        'All-Encompassing Earth Sense' => ['commit_motes' => 1, 'ongoing' => true],
        'All-Encompassing Sorcerer\'s Sight' => ['commit_motes' => 1, 'ongoing' => true],
        'Ambush Sensing Premonition' => ['commit_motes' => 1, 'ongoing' => true],
        'Angry Predator Frenzy' => ['commit_motes' => 1, 'ongoing' => true],
        'Arbor Sentinel Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Arise and Slaughter' => ['commit_motes' => 1, 'ongoing' => true],
        'Artificer\'s Keen Eye' => ['purchase_limit' => '2'],
        'Battle Form Mimicry' => ['commit_motes' => 1, 'ongoing' => true],
        'Behemoth-Slaying Attitude' => ['commit_motes' => 2, 'ongoing' => true],
        'Benediction of the Living Ship' => ['commit_motes' => 2, 'ongoing' => true],
        'Bloodslick Crimson Barb' => ['commit_motes' => 1, 'ongoing' => true],
        'Body Mending Meditation' => ['commit_motes' => 1, 'ongoing' => true],
        'Body Obeys Ego' => ['commit_motes' => 1, 'ongoing' => true],
        'Body Reweaving Matrix' => ['commit_motes' => 1, 'ongoing' => true],
        'Breath-Tasting Ward' => ['commit_motes' => 1, 'ongoing' => true],
        'Butterfly Eyes Mirage' => ['commit_motes' => 1, 'ongoing' => true],
        'Cadaverous Torpor Technique' => ['ongoing' => true],
        'Calling the Rider\'s Companion' => ['ongoing' => true],
        'Changing Phases Transformation' => ['commit_motes' => 1, 'ongoing' => true],
        'Chimera-Soul Expression' => ['purchase_limit' => 'essence', 'choice_type' => 'freetext'],
        'Cloud-Treading Method' => ['commit_motes' => 1, 'ongoing' => true],
        'Cosmic Transcendence of (Virtue)' => ['purchase_limit' => '2', 'choice_type' => 'freetext', 'pick_counts' => [1, 1]],
        'Courage-Decanting Alchemy' => ['commit_motes' => 1, 'ongoing' => true],
        'Crane Form' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'crane_form'],
        'Crushing Claw Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Cunning Anglerfish Decoy' => ['commit_motes' => 1, 'ongoing' => true],
        'Cunning Warrior Regimen' => ['commit_motes' => 2, 'ongoing' => true],
        'Cyclic Scythe' => ['commit_motes' => 1, 'ongoing' => true],
        'Dark Miracle Mimicry' => ['commit_motes' => 1, 'ongoing' => true],
        'Dauntless Yeddim Caravan' => ['commit_motes' => 1, 'ongoing' => true],
        'Dazzling Flare' => ['purchase_limit' => '2'],
        'Death Needs Nothing' => ['commit_motes' => 1, 'ongoing' => true],
        'Death-Sensing Probe' => ['commit_motes' => 1, 'ongoing' => true],
        'Defense of Shining Joy' => ['mechanical_key' => 'shining_joy'],
        'Deferred Wounds' => ['commit_motes' => 1, 'ongoing' => true],
        'Desert-and-Flame Endurance' => ['commit_motes' => 1, 'ongoing' => true],
        'Devil-Body Incarnation' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '3', 'choice_type' => 'custom', 'pick_counts' => [2, 1, 1], 'choice_options' => ['Wicked Armaments', 'Overwhelming Mien', 'Towering Stature', 'Devil Senses', 'Force of Nature', 'Hideous Speed']],
        'Devil-Queen\'s Court' => ['commit_motes' => 2, 'ongoing' => true],
        'Dissident-Searing Intent' => ['purchase_limit' => '2', 'choice_type' => 'freetext', 'pick_counts' => [1, 0]],
        'Distracting Patter Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Doubt-Sealing Heist' => ['commit_motes' => 1, 'ongoing' => true],
        'Dragon Coil Technique' => ['purchase_limit' => '2'],
        'Dragon Surmounts the Waterfall' => ['commit_motes' => 1, 'ongoing' => true],
        'Dragon-Graced Weapon' => ['commit_motes' => 1, 'ongoing' => true],
        'Dread Tiger\'s Symmetry' => ['commit_motes' => 1, 'ongoing' => true],
        'Eagle-Wing Style' => ['commit_motes' => 2, 'ongoing' => true],
        'Earth Dragon Form' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'earth_dragon_form'],
        'Ebon Shadow Form' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'ebon_shadow_form'],
        'Effective Leadership Algorithm' => ['commit_motes' => 2, 'ongoing' => true],
        'Efficient Secretary Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Elegy for the Fallen' => ['commit_motes' => 1, 'ongoing' => true],
        'Elemental Protection Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Embodied Resonance Transplant' => ['purchase_limit' => 'essence', 'choice_type' => 'freetext'],
        'Endurance of a Thousand Cuts' => ['purchase_limit' => '2'],
        'Ever-Steady Graveward Heart' => ['commit_motes' => 3, 'ongoing' => true, 'purchase_limit' => '2'],
        'Fathoms-Fed Spirit' => ['commit_motes' => 1, 'ongoing' => true],
        'Faultless Ceremony' => ['ongoing' => true],
        'Fearless Vanguard Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Fieldhand Clarion' => ['commit_motes' => 1, 'ongoing' => true],
        'Finding the Chorus' => ['commit_motes' => 1, 'ongoing' => true],
        'Fire Dragon Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Fivefold Resonance Sense' => ['commit_motes' => 1, 'ongoing' => true],
        'Flawlessly Impenetrable Disguise' => ['commit_motes' => 1, 'ongoing' => true],
        'Flow Like Blood' => ['commit_motes' => 1, 'ongoing' => true],
        'Flowing God-Dragon Stance' => ['commit_motes' => 2, 'ongoing' => true],
        'Foe-Restraining Whirlpool' => ['commit_motes' => 1, 'ongoing' => true],
        'Forgetting the Lie' => ['commit_motes' => 1, 'ongoing' => true],
        'Four Magical Materials Form' => ['commit_motes' => 2, 'ongoing' => true],
        'Games of Divinity Form' => ['commit_motes' => 2, 'ongoing' => true, 'mechanical_key' => 'games_of_divinity'],
        'General of the All-Seeing Sun' => ['purchase_limit' => '2'],
        'Ghost-Emperor Edict' => ['commit_motes' => 1, 'ongoing' => true],
        'Ghostly Sentinel Technique' => ['commit_motes' => 3, 'ongoing' => true],
        'Glorious Exalted Bolt' => ['commit_motes' => 1, 'ongoing' => true],
        'Glorious Solar Arsenal' => ['commit_motes' => 1, 'ongoing' => true],
        'God-Bearing Juggernaut' => ['purchase_limit' => '2'],
        'Graceful Crane Stance' => ['commit_motes' => 1, 'ongoing' => true],
        'Grasping Pseudopod Method' => ['commit_motes' => 1, 'ongoing' => true],
        'Greatness-Inspiring Aura' => ['commit_motes' => 1, 'ongoing' => true],
        'Guarded Mind Meditation' => ['commit_motes' => 1, 'ongoing' => true],
        'Guiding Shadow Shroud' => ['commit_motes' => 1, 'ongoing' => true],
        'Hardship-Surviving Spirit' => ['commit_motes' => 1, 'ongoing' => true],
        'Harmonious Academic Methodology' => ['commit_motes' => 2, 'ongoing' => true],
        'Harmonious Presence Meditation' => ['commit_motes' => 1, 'ongoing' => true],
        'Healer\'s Boundless Grace' => ['purchase_limit' => '2'],
        'Heartless Maiden Trance' => ['commit_motes' => 2, 'ongoing' => true, 'mechanical_key' => 'heartless_maiden'],
        'Honored Memories of Mastery' => ['commit_motes' => 1, 'ongoing' => true],
        'Hungry All-Consuming Cloud' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2'],
        'Hunter-Baffling Quarry\'s Curse' => ['commit_motes' => 1, 'ongoing' => true],
        'Hybrid Body Transformation' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2'],
        'Hypnotic Tongue Technique' => ['purchase_limit' => '2'],
        'Identity Obfuscation Matrix' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2'],
        'Ideology Redefinition Trick' => ['commit_motes' => 1, 'ongoing' => true],
        'Immortal Mariner\'s Advantage' => ['commit_motes' => 1, 'ongoing' => true],
        'In the Nick of Time' => ['commit_motes' => 2, 'ongoing' => true],
        'Insidious Lunar Transformation' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '3'],
        'Insightful Managerial Aptitude' => ['commit_motes' => 1, 'ongoing' => true],
        'Integrity-Protecting Principle' => ['ongoing' => true],
        'Intolerable Burning Truths' => ['commit_motes' => 1, 'ongoing' => true],
        'Iron Kettle Body' => ['purchase_limit' => '2'],
        'King of Thieves Spirit' => ['purchase_limit' => '2'],
        'Life-Scaffolding Survival' => ['commit_motes' => 1, 'ongoing' => true],
        'Living Hive Transformation' => ['commit_motes' => 2, 'ongoing' => true],
        'Loyal Guardian Approach' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'loyal_guardian'],
        'Malady-Resisting Meditation' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Manifold Hunter\'s Tactics' => ['purchase_limit' => '2'],
        'Mantis Form' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'mantis_form'],
        'Master Physician Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Masterful Performance Exercise' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Memory-Drinking Meditation' => ['purchase_limit' => '3'],
        'Millstone Meteor Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Mind-Hand Manipulation' => ['commit_motes' => 1, 'ongoing' => true],
        'Mountainous Spirit Expression' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Mouse Conquers the Lion' => ['commit_motes' => 1, 'ongoing' => true],
        'Name-Pilfering Practice' => ['commit_motes' => 1, 'ongoing' => true],
        'Necromantic Initiation' => ['purchase_limit' => '3'],
        'Nemesis Self Imagined Anew' => ['commit_motes' => 1, 'ongoing' => true],
        'Optical Shroud' => ['commit_motes' => 2, 'ongoing' => true],
        'Orichalcum Battle Soul' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2'],
        'Overwhelming Fire Majesty Stance' => ['commit_motes' => 1, 'ongoing' => true],
        'Perspective-Consuming Grandeur' => ['commit_motes' => 1, 'ongoing' => true],
        'Pestilence-Bearing Touch' => ['choice_type' => 'freetext'],
        'Phantom Arrow' => ['commit_motes' => 1, 'ongoing' => true],
        'Phase Shifting Apparatus' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Poetic Expression Style' => ['commit_motes' => 1, 'ongoing' => true],
        'Predator-and-Prey Mirror' => ['commit_motes' => 1, 'ongoing' => true],
        'Prismatic Arrangement of Creation Form' => ['commit_motes' => 2, 'ongoing' => true],
        'Prodigious Bounty' => ['purchase_limit' => '2'],
        'Quickening the Forge' => ['commit_motes' => 2, 'ongoing' => true],
        'Ramparts of Obedient Earth' => ['commit_motes' => 1, 'ongoing' => true],
        'Reality Embellishment Approach' => ['commit_motes' => 1, 'ongoing' => true],
        'Relentless Lunar Fury' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'relentless_fury'],
        'Relentless Tracking Protocol' => ['commit_motes' => 1, 'ongoing' => true],
        'Reverent Mortuary Witness' => ['commit_motes' => 1, 'ongoing' => true],
        'Righteous Devil Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Rocks and Storms Chorus' => ['ongoing' => true],
        'Root-and-Hand Merging' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'root_and_hand'],
        'Rough-Spun Hero Raiment' => ['purchase_limit' => '2'],
        'Sagacious Reading of Intent' => ['commit_motes' => 1, 'ongoing' => true],
        'Scars Become Armor' => ['commit_motes' => 1, 'ongoing' => true],
        'Scent of Blood' => ['commit_motes' => 1, 'ongoing' => true],
        'Seasoned Criminal Method' => ['commit_motes' => 1, 'ongoing' => true],
        'Second Chance Approach' => ['commit_motes' => 1, 'ongoing' => true],
        'Sense-Riding Technique' => ['commit_motes' => 2, 'ongoing' => true],
        'Seven League Stride' => ['commit_motes' => 2, 'ongoing' => true],
        'Shadow Cloak Technique' => ['commit_motes' => 1, 'ongoing' => true],
        'Shadowed Warfare Methodology' => ['commit_motes' => 1, 'ongoing' => true],
        'Sharpshooter\'s Clever Tricks' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Shroud of Night\'s Law' => ['commit_motes' => 1, 'ongoing' => true],
        'Shun the Smiling Lady' => ['commit_motes' => 1, 'ongoing' => true],
        'Simple and Resounding Honesty' => ['commit_motes' => 1, 'ongoing' => true],
        'Sister to Aurochs' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Skin-Flaying Wind Dance' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'skin_flaying'],
        'Snake Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Snow Follows Winter' => ['commit_motes' => 2, 'ongoing' => true],
        'Solar Tactician\'s Acumen' => ['commit_motes' => 1, 'ongoing' => true],
        'Sorcerous Initiation' => ['purchase_limit' => '3'],
        'Soul Fire Shaper Form' => ['commit_motes' => 2, 'ongoing' => true, 'mechanical_key' => 'soul_fire_shaper'],
        'Soul-Stirring Cantata' => ['commit_motes' => 1, 'ongoing' => true],
        'Spirit-Cutting Glance' => ['commit_motes' => 1, 'ongoing' => true],
        'Spirit-Repelling Diagram' => ['commit_motes' => 1, 'ongoing' => true],
        'Stalk Blunts the Sickle' => ['purchase_limit' => '2'],
        'Stalks Have Eyes' => ['commit_motes' => 2, 'ongoing' => true],
        'Stifled Cry Exercise' => ['commit_motes' => 1, 'ongoing' => true],
        'Storm-Calling Strategies' => ['commit_motes' => 1, 'ongoing' => true],
        'Stout-Hearted Brewing Style' => ['commit_motes' => 3, 'ongoing' => true],
        'Strange Tongue Understanding' => ['commit_motes' => 1, 'ongoing' => true],
        'Strawmaiden\'s Calling' => ['purchase_limit' => '2'],
        'Streaming Arrow Stance' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'streaming_arrow'],
        'Stubborn Boar Defense' => ['ongoing' => true],
        'Subtle Expression Method' => ['ongoing' => true],
        'Summoned from Time' => ['ongoing' => true],
        'Suspicion-Allaying Gesture' => ['commit_motes' => 1, 'ongoing' => true],
        'Sweat and Toil Radiance' => ['purchase_limit' => '2'],
        'Taste of Familiar Earth' => ['ongoing' => true],
        'Technique-from-Taste Approach' => ['purchase_limit' => '2', 'choice_type' => 'freetext', 'pick_counts' => [1, 0]],
        'Terraforming Protocol' => ['commit_motes' => 1, 'ongoing' => true],
        'The Perfect Bargain' => ['commit_motes' => 1, 'ongoing' => true],
        'This Far and No Further' => ['commit_motes' => 4, 'ongoing' => true],
        'Throne-Smashing Ambition' => ['commit_motes' => 1, 'ongoing' => true],
        'Tiger Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Towering Redwood Stature' => ['commit_motes' => 2, 'ongoing' => true],
        'Trackless Region Navigation' => ['commit_motes' => 1, 'ongoing' => true],
        'True Undeath' => ['commit_motes' => 1, 'ongoing' => true],
        'Truth is Relative' => ['commit_motes' => 1, 'ongoing' => true],
        'Truth-and-Lies Detection' => ['commit_motes' => 1, 'ongoing' => true],
        'Unbreakable Fascination Exercise' => ['commit_motes' => 1, 'ongoing' => true],
        'Unbreakable Laws of Hell' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Under the Crimson Banner' => ['commit_motes' => 2, 'ongoing' => true],
        'Underling-Promoting Practice' => ['commit_motes' => 2, 'ongoing' => true],
        'Undying Body' => ['commit_motes' => 2, 'ongoing' => true, 'mechanical_key' => 'undying_body'],
        'Unfettered Sun Evasion' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2', 'choice_type' => 'freetext', 'pick_counts' => [0, 1]],
        'Unforged Masterworks' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Unleash Homunculus' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Unliving Industry' => ['commit_motes' => 2, 'ongoing' => true],
        'Unswerving Juggernaut Principle' => ['commit_motes' => 2, 'ongoing' => true],
        'Vermin Clearing Shout' => ['purchase_limit' => '2'],
        'Viridian Rust Defense' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'viridian_rust'],
        'Void Avatar Embodiment' => ['commit_motes' => 3, 'ongoing' => true, 'mechanical_key' => 'void_avatar'],
        'Walking Outside Fate' => ['commit_motes' => 1, 'ongoing' => true],
        'Water Dragon Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Watering Parched Fields' => ['commit_motes' => 2, 'ongoing' => true],
        'Web of Veins' => ['commit_motes' => 1, 'ongoing' => true],
        'Wellness-Restoring Meditation' => ['commit_motes' => 1, 'ongoing' => true],
        'White Reaper Form' => ['commit_motes' => 1, 'ongoing' => true],
        'Wickedness-Unveiling Method' => ['purchase_limit' => '3'],
        'Wilderness-Commanding Practice' => ['commit_motes' => 2, 'ongoing' => true, 'purchase_limit' => '2'],
        'With One Mind' => ['commit_motes' => 1, 'ongoing' => true],
        'Withering Dirge' => ['commit_motes' => 1, 'ongoing' => true],
        'Witness Rapport Technique' => ['commit_motes' => 1, 'ongoing' => true, 'purchase_limit' => '2'],
        'Witness to Darkness' => ['commit_motes' => 1, 'ongoing' => true],
        'Wood Dragon Form' => ['commit_motes' => 1, 'ongoing' => true, 'mechanical_key' => 'wood_dragon_form'],
    ];

    /** Commit dots that come with a mode: charm, mode label, start of the mode's text, dots. @var list<array{string, string, string, int}> */
    private const MODES = [
        ['As the Crow Flies', 'Liminal', 'Wandering Outcast', 1],
        ['As the Crow Flies', 'Sidereal', 'Finding the Golden', 1],
        ['Bureau-Breaking Method', 'Lunar', 'Gnawing Mouse', 1],
        ['Bureau-Breaking Method', 'Sidereal', 'Paralyzed Committee', 1],
        ['Bureau-Breaking Method', 'Abyssal', 'Despair-Inducing', 1],
        ['Cunning Warrior Regimen', 'Infernal', 'Puissance Mimicry', 1],
        ['Flawlessly Impenetrable Disguise', 'Solar', 'Perfect Mirror', 1],
        ['Flawlessly Impenetrable Disguise', 'Sidereal', 'Masque of the Uncanny', 1],
        ['Glorious Exalted Bolt', 'Solar', 'Blazing Solar Bolt', 1],
        ['Harmonious Presence Meditation', 'Upgrade', 'Majestic Radiant', 1],
        ['League of Iron Preparation', 'Infernal', 'Demon-Blooded', 1],
        ['Masterful Performance Exercise', 'Solar', 'Artful Disengagement', 1],
        ['Monkey Leap Technique', 'Upgrade', 'Soaring Crane Leap', 1],
        ['Mouse Conquers the Lion', 'Infernal', 'Opened Eye', 1],
        ['Rider-and-Mount Unity', 'Sidereal', 'Ride the Dragon', 2],
        ['Sharpshooter\'s Clever Tricks', 'Sidereal', 'Strange Quiver', 1],
        ['Spirit-Repelling Diagram', 'Dragon-Blooded', 'Seed and Salt', 1],
        ['Spirit-Repelling Diagram', 'Janest', 'Seed and Salt', 1],
        ['Swift Counterattack', 'Solar', 'Ready in Eight', 1],
        ['Swift Counterattack', 'Abyssal', 'Hundred Razor', 1],
        ['Swift Counterattack', 'Infernal', 'Devilish Retribution', 1],
        ['Wellness-Restoring Meditation', 'Infernal', 'Price of Mercy', 1],
        ['Glorious Solar Arsenal', 'Upgrade', 'Perfected Shining Summons', 1],
        ['Observer-Deceiving Attack', 'Upgrade', 'Mist on Water', 1],
        ['Principle-Maintaining Method', 'Upgrade', 'Elusive Dream', 2],
        ['Ship-Claiming Stance', 'Upgrade', 'Ship-Self Awareness', 2],
        ['All-Consuming Entropy Attack', 'Upgrade', 'Annihilating Gaze', 1],
        ['Unhallowed Ghost Ship', 'Upgrade', 'Mist-Veiled', 1],
        ['Devil-Queen\'s Court', 'Upgrade', 'Devil-Queen\'s Intrigues', 1],
        ['Devil-Queen\'s Court', 'Upgrade', 'Devil-Queen\'s Majesty', 1],
        ['Mind-Hand Manipulation', 'Upgrade', 'Unseen Force', 1],
        ['Mind-Hand Manipulation', 'Upgrade', 'Self-Sealing', 1],
        ['Bone-Setter\'s Discernment', 'Upgrade', 'Physician\'s Eye', 1],
        ['Rough-Spun Hero Raiment', 'Repurchase', 'Gold Like Wheat', 1],
        ['Vermin Clearing Shout', 'Repurchase', 'Unwavering Resolve', 1],
    ];

    public function up(): void
    {
        foreach (self::CHARMS as $name => $settings) {
            $id = DB::table('charm_library')->where('name', $name)->value('id');
            if ($id === null) {
                continue;
            }
            $options = $settings['choice_options'] ?? [];
            unset($settings['choice_options']);
            if (isset($settings['pick_counts'])) {
                $settings['pick_counts'] = json_encode($settings['pick_counts']);
            }
            DB::table('charm_library')->where('id', $id)->update($settings);
            if ($options !== []) {
                DB::table('charm_choice_options')->where('charm_id', $id)->delete();
                DB::table('charm_choice_options')->insert(array_map(
                    fn (string $option, int $i) => ['charm_id' => $id, 'option' => $option, 'sort_order' => $i],
                    $options, array_keys($options),
                ));
            }
        }

        foreach (self::MODES as [$charm, $label, $start, $dots]) {
            $id = DB::table('charm_library')->where('name', $charm)->value('id');
            DB::table('charm_modes')->where('charm_id', $id)->where('label', $label)
                ->where('mode_text', 'like', $start.'%')->update(['commit_motes' => $dots]);
        }
    }

    public function down(): void
    {
        foreach (self::CHARMS as $name => $settings) {
            $id = DB::table('charm_library')->where('name', $name)->value('id');
            if ($id === null) {
                continue;
            }
            $reset = [];
            foreach (array_keys($settings) as $column) {
                if ($column === 'choice_options') {
                    DB::table('charm_choice_options')->where('charm_id', $id)->delete();
                } else {
                    $reset[$column] = match ($column) {
                        'commit_motes' => 0,
                        'ongoing' => false,
                        default => null,
                    };
                }
            }
            DB::table('charm_library')->where('id', $id)->update($reset);
        }
        // The modes' column goes with the previous migration's down().
    }
};
