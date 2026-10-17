# Charm implementation — every charm, done

Every charm in the library was reviewed on 2026-10-17 against the rules agreed for
Kaien's charms (`info/kaien-charms-review.md`). How the pieces work on the sheet:
`Summary.md` → Using charms on the sheet. The settings are in migration
`2026_10_17_000002_charm_sheet_settings_all` (and Admin → Charms); the sheet
effects in `src/lib/charmEffects.ts`. Open questions: `CHARM_QUESTIONS.md`.

**The rules, in short.** A charm that commits motes gets that many commit dots and an
in-use icon; one with another ongoing effect (it lasts the scene or longer) gets the
icon only. Spending motes on a roll, a step or a question needs nothing — the table
tracks that. A passive effect needs nothing unless it changes a number the sheet
shows (Defenses, health track, wound penalty); those are worked out while the icon is
on. Dots that come with a mode (another Exalt type's, an upgrade) show only for a
character who owns that mode. A charm with Repurchase modes can be bought once per
mode more (its limit); choices are asked when bought.

**Totals:** 484 charms — 215 built, 231 need nothing, 22 set up with Kaien's charms, 16 waiting on a question.

## Abyssal

| Charm | On the sheet |
|---|---|
| All-Consuming Entropy Attack | ✅ +1 dot with Annihilating Gaze (upgrade) |
| Arise and Slaughter | ✅ 1 commit dot + in-use icon |
| Artful Maiming Onslaught | ✅ Nothing to build |
| Cadaverous Torpor Technique | ✅ in-use icon |
| Corpse Questioning Technique | ✅ Nothing to build |
| Corpse-Commanding Attitude | ✅ Nothing to build |
| Death Approaches | ✅ Nothing to build |
| Death Needs Nothing | ✅ 1 commit dot + in-use icon |
| Death-Pact Ascension | ✅ Nothing to build |
| Ebon Lightning Flash | ✅ Nothing to build |
| Elegy for the Fallen | ✅ 1 commit dot + in-use icon |
| First Blood Impulse | ✅ Nothing to build |
| Ghost-Emperor Edict | ✅ 1 commit dot + in-use icon |
| Ghostly Sentinel Technique | ✅ 3 commit dots + in-use icon |
| Haunting Monumental Artifice | ✅ Nothing to build |
| Hundred Paces Bite | ✅ Nothing to build |
| Iron Maiden's Kiss | ✅ Nothing to build |
| Killing Words Technique | ✅ Nothing to build |
| Life-Mocking Assembly | ✅ Nothing to build |
| Murder-Saint Dedication | ✅ Nothing to build |
| Pestilence-Bearing Touch | ✅ asks for its signature disease when bought |
| Reverent Mortuary Witness | ✅ 1 commit dot + in-use icon |
| Shadow Cloak Technique | ✅ 1 commit dot + in-use icon |
| Shadowed Warfare Methodology | ✅ 1 commit dot + in-use icon |
| Soul-Drinking Bite | ✅ Nothing to build |
| Stepping Outside Existence | ✅ Nothing to build |
| Stifled Cry Exercise | ✅ 1 commit dot + in-use icon |
| Unhallowed Ghost Ship | ✅ +1 dot with Mist-Veiled (upgrade) |
| Void Avatar Embodiment | ✅ 3 commit dots + in-use icon; Hardness +3 while in use |
| Wickedness-Unveiling Method | ✅ limit 3 |
| Withering Dirge | ✅ 1 commit dot + in-use icon |

## Alchemical

| Charm | On the sheet |
|---|---|
| Advisor's Sage Instruction | ✅ Nothing to build |
| Artificer's Keen Eye | ✅ limit 2 |
| Augmented Attribute | ✅ nothing more to build: its choice already works, and Excellency dice are not shown on the sheet |
| Battle Form Mimicry | ✅ 1 commit dot + in-use icon |
| Better Than New | ✅ Nothing to build |
| Body Reweaving Matrix | ✅ 1 commit dot + in-use icon |
| Bone-and-Steel Destruction | ✅ Nothing to build |
| Celestial Overseer Concordat | ✅ Nothing to build |
| Contingency Preparation Axiom | ✅ Nothing to build |
| Effective Leadership Algorithm | ✅ 2 commit dots + in-use icon |
| Efficient Planning Matrix | ✅ Nothing to build |
| Exhaustive Interrogation Method | ✅ Nothing to build |
| Fine-Tuning | ✅ Nothing to build |
| Future-Proclaiming Canticle | ✅ Nothing to build |
| Identity Obfuscation Matrix | ✅ 2 commit dots + in-use icon; limit 2 |
| Insightful Managerial Aptitude | ✅ 1 commit dot + in-use icon |
| Lifesign Detecting Scan | ✅ Nothing to build |
| Machine-God Protector Mode | ✅ Nothing to build |
| Material Resistance Procedure | ✅ Nothing to build |
| Morale Building Declaration | ✅ Nothing to build |
| Omnipresent Guardian Directive | ✅ Nothing to build |
| Optical Shroud | ✅ 2 commit dots + in-use icon |
| Outlier Analysis Method | ✅ Nothing to build |
| Perfected Union Patterning | ✅ Nothing to build |
| Phase Shifting Apparatus | ✅ 1 commit dot + in-use icon; limit 2 |
| Portable Utility Compartment | ✅ Nothing to build |
| Priority-Discerning Protocol | ✅ Nothing to build |
| Reinforced Chassis | ✅ Nothing to build |
| Relentless Tracking Protocol | ✅ 1 commit dot + in-use icon |
| Subtle Concept Introduction Method | ✅ Nothing to build |
| Terraforming Protocol | ✅ 1 commit dot + in-use icon |
| Truth-and-Lies Detection | ✅ 1 commit dot + in-use icon |
| Verbatim Recall | ✅ Nothing to build |

## Dragon-Blooded

| Charm | On the sheet |
|---|---|
| All-Encompassing Earth Sense | ✅ 1 commit dot + in-use icon |
| Arbor Sentinel Technique | ✅ 1 commit dot + in-use icon |
| Benediction of the Living Ship | ✅ 2 commit dots + in-use icon |
| Blazing Charger Attack | ✅ Nothing to build |
| Current Sweeps to Sea | ✅ Nothing to build |
| Dragon Surmounts the Waterfall | ✅ 1 commit dot + in-use icon |
| Dragon Vortex Attack | ✅ Nothing to build |
| Dragon-Graced Weapon | ✅ 1 commit dot + in-use icon |
| Drowning Embrace | ✅ Nothing to build |
| Elemental Burst Technique | ✅ Nothing to build |
| Elemental Protection Technique | ✅ 1 commit dot + in-use icon |
| Entombed Mind Technique | ✅ Nothing to build |
| Fivefold Resonance Sense | ✅ 1 commit dot + in-use icon |
| Flaw-Finding Examination | ✅ Nothing to build |
| Flowing God-Dragon Stance | ✅ 2 commit dots + in-use icon |
| Granite Curtain of Serenity | ✅ Nothing to build |
| Oath of the Ten Thousand Dragons | ✅ Nothing to build |
| Passion-Inflaming Artistry | ✅ Nothing to build |
| Ramparts of Obedient Earth | ✅ 1 commit dot + in-use icon |
| Root-and-Hand Merging | ✅ 1 commit dot + in-use icon; Parry and Evasion +1 while in use |
| Rose-Among-Thorns Distinction | ✅ Nothing to build |
| Safety Among Enemies | ✅ Nothing to build |
| Sense-Riding Technique | ✅ 2 commit dots + in-use icon |
| Stones-from-Rubble Restoration | ✅ Nothing to build |
| Storm-Calling Strategies | ✅ 1 commit dot + in-use icon |
| Thoughtful Gift Technique | ✅ Nothing to build |
| Unflagging Vengeance Meditation | ✅ Nothing to build |
| Wind-Carried-Words Technique | ✅ Nothing to build |
| With One Mind | ✅ 1 commit dot + in-use icon |

## Getimian

| Charm | On the sheet |
|---|---|
| Alchemic Power Reserve | ✅ Nothing to build |
| Bent Reality Stance | ✅ Nothing to build |
| Constant Problem Tactic | ✅ Nothing to build |
| Courage-Decanting Alchemy | ✅ 1 commit dot + in-use icon |
| Culture-Hero Usurpation | ✅ Nothing to build |
| Devil-Queen's Court | ✅ 2 commit dots + in-use icon; +1 dot with Devil-Queen's Intrigues (upgrade); +1 dot with Devil-Queen's Majesty (upgrade) |
| Distilled-Emotion Elixir | ✅ Nothing to build |
| Fate-Unwinding Denial | ✅ Nothing to build |
| Finding the Chorus | ✅ 1 commit dot + in-use icon |
| Folding Space | ✅ Nothing to build |
| Forgetting the Lie | ✅ 1 commit dot + in-use icon |
| Here-and-Everywhere Approach | ✅ Nothing to build |
| Icon-Obliterating Passion | ✅ Nothing to build |
| Ideology Redefinition Trick | ✅ 1 commit dot + in-use icon |
| One-on-One Imprisonment | ✅ Nothing to build |
| Perspective-Consuming Grandeur | ✅ 1 commit dot + in-use icon |
| Reality Embellishment Approach | ✅ 1 commit dot + in-use icon |
| Sleeper-Guiding Whisper | ✅ Nothing to build |
| Space-and-Time Understanding | ✅ Nothing to build |
| Spatial Disjunction | ✅ Nothing to build |
| Summoned from Time | ✅ in-use icon |
| The Filial Chain | ✅ Nothing to build |
| Throne-Smashing Ambition | ✅ 1 commit dot + in-use icon |
| Truth is Relative | ✅ 1 commit dot + in-use icon |
| Unavoidable Confrontation | ✅ Nothing to build |
| Unforged Masterworks | ✅ 1 commit dot + in-use icon; limit 2 |
| Wall-Denying Fury | ✅ Nothing to build |

## Infernal

| Charm | On the sheet |
|---|---|
| Acquainted with Deception | ✅ 1 commit dot + in-use icon |
| Blinded by Hellfire | ✅ Nothing to build |
| Body Obeys Ego | ✅ 1 commit dot + in-use icon |
| Broken Silence Laughter Defense | ✅ Nothing to build |
| Ceaseless Demon Hunger | ✅ Nothing to build |
| Claiming the Devil's Due | ✅ Nothing to build |
| Constructive Convergence of Principles | ❓ Question 9 |
| Cosmic Transcendence of (Virtue) | ✅ each purchase asks for its Virtue; limit 2 |
| Dark Miracle Mimicry | ✅ 1 commit dot + in-use icon |
| Death of All Happiness | ✅ Nothing to build |
| Desert-and-Flame Endurance | ✅ 1 commit dot + in-use icon |
| Devil Emperor Edict | ✅ Nothing to build |
| Devil-Body Incarnation | ✅ 1 commit dot + in-use icon; choose 2 benefits when bought, 1 more per repurchase; limit 3 |
| Endless Nightmare Vigilance | ✅ Nothing to build |
| Every Man a Devil | ✅ Nothing to build |
| Golden Years Tarnished Black | ✅ Nothing to build |
| Hideous Hundred-Limb Strike | ✅ Nothing to build |
| Inevitable Betrayal Insight | ✅ Nothing to build |
| Inner Devil Unchained | ✅ Nothing to build |
| Intolerable Burning Truths | ✅ 1 commit dot + in-use icon |
| Joy in Violence | ✅ Nothing to build |
| Mind-Hand Manipulation | ✅ 1 commit dot + in-use icon; +1 dot with Unseen Force (upgrade); +1 dot with Self-Sealing (upgrade) |
| Naked Soul Insight | ❓ Question 12 |
| Naked Soul Insight | ❓ Question 12 |
| Nemesis Self Imagined Anew | ✅ 1 commit dot + in-use icon |
| Oasis-Scouring Malediction | ✅ Nothing to build |
| Our Little Secret | ✅ Nothing to build |
| Scars Become Armor | ✅ 1 commit dot + in-use icon |
| Shadow Spite Curse | ✅ Nothing to build |
| Skin-Flaying Wind Dance | ✅ 1 commit dot + in-use icon; Parry and Evasion +1 while in use |
| Skin-Twisting Metamorphosis | ✅ Nothing to build |
| Symphony of Sinful Prayers | ✅ Nothing to build |
| Taste-of-Hell Infliction | ✅ Nothing to build |
| Unbreakable Laws of Hell | ✅ 1 commit dot + in-use icon; limit 2 |
| Venom Blood Revenge | ✅ Nothing to build |
| Viridian Rust Defense | ✅ 1 commit dot + in-use icon; Soak +2 while in use and wearing armor |
| Will-Crushing Force | ✅ Nothing to build |
| Wish-Granting Wickedness | ✅ Nothing to build |
| Witness to Darkness | ✅ 1 commit dot + in-use icon |
| Wrath-Stoked Onslaught | ✅ Nothing to build |

## Liminal

| Charm | On the sheet |
|---|---|
| Autopsy-and-Dissection Glance | ✅ Nothing to build |
| Black Wind of Desire | ✅ Nothing to build |
| Bloodslick Crimson Barb | ✅ 1 commit dot + in-use icon |
| Blossoming Clot Ministrations | ✅ Nothing to build |
| Bone Deep Body Reconfiguration | ✅ Nothing to build |
| Breath-Tasting Ward | ✅ 1 commit dot + in-use icon |
| Corporeal Reformation | ✅ Nothing to build |
| Cyclic Scythe | ✅ 1 commit dot + in-use icon |
| Death-Sensing Probe | ✅ 1 commit dot + in-use icon |
| Deathbound Mania | ✅ Nothing to build |
| Embodied Resonance Transplant | ✅ each purchase asks for the magical material; limit Essence |
| Ever-Steady Graveward Heart | ✅ 3 commit dots + in-use icon; limit 2 |
| Gravedigger's Elan | ✅ Nothing to build |
| Honored Memories of Mastery | ✅ 1 commit dot + in-use icon |
| Investiture of Flesh | ❓ Question 10 |
| Last Exhalation of Secrets | ✅ Nothing to build |
| Life, Death, and Rebirth | ✅ Nothing to build |
| Life-Scaffolding Survival | ❓ Question 5 — built so far: 1 commit dot + in-use icon |
| Muscle-Hemorrhaging Exertion | ✅ Nothing to build |
| Pain Syphoning Sigh | ✅ Nothing to build |
| Scent of Blood | ✅ 1 commit dot + in-use icon |
| Soft Touch of Hospice | ✅ Nothing to build |
| Tomb and Ruin Inspection | ✅ Nothing to build |
| Towering Corporeal Pillar | ✅ Nothing to build |
| True Undeath | ✅ 1 commit dot + in-use icon |
| Undying Body | ❓ Question 6 — built so far: 2 commit dots + in-use icon; Soak +2, Hardness +2, wound penalty −1 while in use; +1 Bruised level at Essence 3, +2 at Essence 5 |
| Unleash Homunculus | ✅ 1 commit dot + in-use icon; limit 2 |
| Unliving Industry | ✅ 2 commit dots + in-use icon |
| Web of Veins | ✅ 1 commit dot + in-use icon |
| Weeping Crimson Gaze | ✅ Nothing to build |

## Lunar

| Charm | On the sheet |
|---|---|
| Adder Fang Method | ✅ 1 commit dot + in-use icon; limit 2 |
| Ant-and-Yeddim Wisdom | ✅ Nothing to build |
| Beast-Soul Awakening | ✅ Nothing to build |
| Boundary-Marking Meditation | ✅ Nothing to build |
| Butterfly Eyes Mirage | ✅ 1 commit dot + in-use icon |
| Changing Phases Transformation | ✅ 1 commit dot + in-use icon |
| Chimera-Soul Expression | ✅ each purchase asks for the animal (and New Type or Family Tree); limit Essence |
| Creation Spanning Passion | ✅ Nothing to build |
| Cunning Anglerfish Decoy | ✅ 1 commit dot + in-use icon |
| Dauntless Yeddim Caravan | ✅ 1 commit dot + in-use icon |
| Grasping Pseudopod Method | ✅ 1 commit dot + in-use icon |
| Hungry All-Consuming Cloud | ❓ Question 3 — built so far: 2 commit dots + in-use icon; limit 2 |
| Hunter-Baffling Quarry's Curse | ✅ 1 commit dot + in-use icon |
| Hybrid Body Transformation | ❓ Question 4 — built so far: 2 commit dots + in-use icon; limit 2 |
| Insidious Lunar Transformation | ✅ 1 commit dot + in-use icon; limit 3 |
| Kraken-Arm Lash | ✅ Nothing to build |
| Laughing Devil Distraction | ✅ Nothing to build |
| Living Hive Transformation | ✅ 2 commit dots + in-use icon |
| Manifold Hunter's Tactics | ❓ Question 11 — built so far: limit 2 |
| Many-Faced Moon Transformation | ✅ Nothing to build |
| Memory-Drinking Meditation | ✅ limit 3 |
| Mountainous Spirit Expression | ✅ 1 commit dot + in-use icon; limit 2 |
| Nightmare Scar Memento | ✅ Nothing to build |
| Predator-and-Prey Mirror | ✅ 1 commit dot + in-use icon |
| Quicksilver Second Face | ✅ Nothing to build |
| Relentless Lunar Fury | ✅ 1 commit dot + in-use icon; wound penalty −1 while in use |
| Shadow Talon Execution | ✅ Nothing to build |
| Sharing Luna's Gifts | ✅ Nothing to build |
| Shattered Yoke Fury | ✅ Nothing to build |
| Spider-Amid-Roses Discernment | ✅ Nothing to build |

## Martial Arts

| Charm | On the sheet |
|---|---|
| Air Dragon Form | ✅ 1 commit dot + in-use icon |
| Angry Predator Frenzy | ✅ 1 commit dot + in-use icon |
| Bleeding Crescent Strike | ✅ Nothing to build |
| Blossom of Inevitable Demise | ✅ Nothing to build |
| Burning Judgment Halo | ✅ Nothing to build |
| Caress of 1,000 Hells | ✅ Nothing to build |
| Cloud-Treading Method | ✅ 1 commit dot + in-use icon |
| Crane Form | ✅ 1 commit dot + in-use icon; Parry and Evasion +1 while in use |
| Crimson Leaping Cat Technique | ✅ Nothing to build |
| Crushing Claw Technique | ✅ 1 commit dot + in-use icon |
| Drowning-in-Blood Technique | ✅ Nothing to build |
| Earth Dragon Form | ✅ 1 commit dot + in-use icon; Soak +3 while in use; Dragon-Blooded also Hardness +1 and no wound penalty |
| Ebon Shadow Form | ✅ 1 commit dot + in-use icon; Evasion uses Stealth instead of Athletics while in use |
| Empowering Justice Redirection | ✅ Nothing to build |
| Fiery Blade Attack | ✅ Nothing to build |
| Fire Dragon Form | ✅ 1 commit dot + in-use icon |
| Flickering Corona Barrier | ✅ Nothing to build |
| Flowing Water Defense | ✅ Nothing to build |
| Fluttering Cry of Warning | ✅ Nothing to build |
| Foe-Restraining Whirlpool | ✅ 1 commit dot + in-use icon |
| Four Magical Materials Form | ❓ Question 2 — built so far: 2 commit dots + in-use icon |
| Games of Divinity Form | ✅ 2 commit dots + in-use icon; Parry and Evasion use the higher of Embassy and Sagacity while in use |
| Humbling Enlightenment Commentary | ✅ Nothing to build |
| Hungry Earth Strike | ✅ Nothing to build |
| Iron-Arm Block | ✅ Nothing to build |
| Lightning Strike Style | ✅ Nothing to build |
| Mantis Form | ✅ 1 commit dot + in-use icon; Parry, Evasion and Soak +1 while in use |
| Nothing but Shadows | ✅ Nothing to build |
| Overwhelming Fire Majesty Stance | ✅ 1 commit dot + in-use icon |
| Prismatic Arrangement of Creation Form | ✅ 2 commit dots + in-use icon |
| Righteous Devil Form | ✅ 1 commit dot + in-use icon |
| Searing Edge Attack | ✅ Nothing to build |
| Serpentine Evasion | ✅ Nothing to build |
| Shattering Fist Strike | ✅ Nothing to build |
| Snake Form | ❓ Question 3 — built so far: 1 commit dot + in-use icon |
| Snow Follows Winter | ✅ 2 commit dots + in-use icon |
| Soul Fire Shaper Form | ✅ 2 commit dots + in-use icon; Hardness +2 while in use (Essence counts 2 higher) |
| Soul Mastery | ✅ Nothing to build |
| Soul-Marking Strike | ✅ Nothing to build |
| Stillness-of-Stone Strike | ✅ Nothing to build |
| Throat-Slitting Shadow Strike | ✅ Nothing to build |
| Tiger Form | ✅ 1 commit dot + in-use icon |
| Unbreakable Fascination Exercise | ✅ 1 commit dot + in-use icon |
| Uncoiling Serpent Aura | ✅ Nothing to build |
| Unfolding Retribution Strike | ✅ Nothing to build |
| Water Dragon Form | ❓ Question 3 — built so far: 1 commit dot + in-use icon |
| White Reaper Form | ✅ 1 commit dot + in-use icon |
| Wood Dragon Form | ✅ 1 commit dot + in-use icon; Parry, Evasion and Soak +1 while in use |
| Wrathful Winds Roar | ✅ Nothing to build |

## Sidereal

| Charm | On the sheet |
|---|---|
| Abandoned Words Curse | ✅ Nothing to build |
| Avoidance | ✅ Nothing to build |
| Cash and Murder Games | ✅ Nothing to build |
| Defense of Shining Joy | ✅ Evasion uses Performance instead of Athletics when it is higher (always on) |
| Deferred Wounds | ✅ 1 commit dot + in-use icon |
| Efficient Secretary Technique | ✅ 1 commit dot + in-use icon |
| End Debate | ✅ Nothing to build |
| Faultless Ceremony | ✅ in-use icon |
| Force Decision | ✅ Nothing to build |
| Fortuitous Wandering | ✅ Nothing to build |
| Heartless Maiden Trance | ✅ 2 commit dots + in-use icon; +1 Bruised health level while in use |
| Icy Hand | ✅ Nothing to build |
| In the Nick of Time | ✅ 2 commit dots + in-use icon |
| Invisible Motion | ✅ Nothing to build |
| Last Vision | ✅ Nothing to build |
| Lover's Oath | ✅ Nothing to build |
| Mending Warped Designs | ✅ Nothing to build |
| Name-Pilfering Practice | ✅ 1 commit dot + in-use icon |
| Of Truths Best Unspoken | ✅ Nothing to build |
| Ordained Bridle of Mercury | ✅ Nothing to build |
| Shadow-Piercing Needle | ✅ Nothing to build |
| Shield of Mars | ✅ Nothing to build |
| Shun the Smiling Lady | ✅ 1 commit dot + in-use icon |
| Thought-Swiping Distraction | ✅ Nothing to build |
| Transcendent Hatchet of Fate | ✅ Nothing to build |
| Unavoidable Sorrow | ✅ Nothing to build |
| Under the Crimson Banner | ✅ 2 commit dots + in-use icon |
| Unswerving Juggernaut Principle | ✅ 2 commit dots + in-use icon |
| Walking Outside Fate | ✅ 1 commit dot + in-use icon |
| Wilderness-Commanding Practice | ✅ 2 commit dots + in-use icon; limit 2 |
| Willing Assumption of Chains | ✅ Nothing to build |

## Solar

| Charm | On the sheet |
|---|---|
| Aspect of the Virtuous Warrior | ✅ Nothing to build |
| Behemoth-Slaying Attitude | ✅ 2 commit dots + in-use icon |
| Dazzling Flare | ✅ limit 2 |
| Dissident-Searing Intent | ✅ limit 2; asks which Intimacy or Virtue it serves when bought |
| Endurance of a Thousand Cuts | Set up with Kaien's charms (2026-10-16); now also limit 2 |
| Evocation: Voice That Holds the Line | Set up with Kaien's charms (2026-10-16) |
| Evocation: Ward of the Sun | Set up with Kaien's charms (2026-10-16) |
| General of the All-Seeing Sun | ✅ limit 2 |
| Glorious Solar Arsenal | ✅ 1 commit dot + in-use icon; +1 dot with Perfected Shining Summons (upgrade) |
| God-Bearing Juggernaut | ✅ limit 2 |
| Healer's Boundless Grace | ✅ limit 2 |
| Hypnotic Tongue Technique | ✅ limit 2 |
| Joyous Handiwork Genius | ✅ Nothing to build |
| King of Thieves Spirit | ✅ limit 2 |
| Meditation on Rivalry | ✅ Nothing to build |
| Observer-Deceiving Attack | ✅ +1 dot with Mist on Water (upgrade) |
| Orichalcum Battle Soul | ✅ 2 commit dots + in-use icon; limit 2 |
| Phantom-Conjuring Performance | ✅ Nothing to build |
| Principle-Maintaining Method | ✅ +2 dots with Elusive Dream (upgrade) |
| Rocks and Storms Chorus | ✅ in-use icon |
| Ship-Claiming Stance | ✅ +2 dots with Ship-Self Awareness (upgrade) |
| Shroud of Night's Law | ✅ 1 commit dot + in-use icon |
| Solar Tactician's Acumen | ✅ 1 commit dot + in-use icon |
| Star-Cleaving Crater | ✅ Nothing to build |
| Sun King Radiance | Set up with Kaien's charms (2026-10-16) |
| Technique-from-Taste Approach | ✅ limit 2; asks for the crafting discipline when bought |
| Unconquered Sun's Sight | Set up with Kaien's charms (2026-10-16) |
| Unfettered Sun Evasion | ✅ 2 commit dots + in-use icon; limit 2; its repurchase asks which gambit it adds |
| Vacant Station Scheme | ✅ Nothing to build |
| Virtue-Shaping Harmony | ✅ Nothing to build |
| Waves-and-Rivers Ranging | ✅ Nothing to build |
| Wyld-Shaping Technique | ❓ Question 9 |

## Strawmaiden Janest

| Charm | On the sheet |
|---|---|
| Belle of the Bee | ✅ Nothing to build |
| Bone-Setter's Discernment | ✅ +1 dot with Physician's Eye (upgrade) |
| Caller of Wind and Rain | ✅ Nothing to build |
| Creation-Embracing Gaze | ✅ Nothing to build |
| Deep-Rooted Tenacity | ✅ Nothing to build |
| Fieldhand Clarion | ✅ 1 commit dot + in-use icon |
| Fieldhand Hefts the Haywain | ✅ Nothing to build |
| Giant-Toppling Spirit | ✅ Nothing to build |
| Millstone Meteor Technique | ✅ 1 commit dot + in-use icon |
| No Time for Idle Dreaming | ✅ Nothing to build |
| Prodigious Bounty | ✅ limit 2 |
| Rough-Spun Hero Raiment | ✅ +1 dot with Gold Like Wheat (repurchase); limit 2 |
| Seven League Stride | ✅ 2 commit dots + in-use icon |
| Simple and Resounding Honesty | ✅ 1 commit dot + in-use icon |
| Sister to Aurochs | ✅ 1 commit dot + in-use icon; limit 2 |
| Stalk Blunts the Sickle | ✅ limit 2 |
| Stalks Have Eyes | ✅ 2 commit dots + in-use icon |
| Stout-Hearted Brewing Style | ✅ 3 commit dots + in-use icon |
| Strawmaiden's Calling | ✅ limit 2 |
| Sweat and Toil Radiance | ✅ limit 2 |
| Taste of Familiar Earth | ✅ in-use icon |
| This Far and No Further | ✅ 4 commit dots + in-use icon |
| Towering Redwood Stature | ✅ 2 commit dots + in-use icon |
| Vermin Clearing Shout | ✅ +1 dot with Unwavering Resolve (repurchase); limit 2 |
| Watering Parched Fields | ✅ 2 commit dots + in-use icon |

## Universal

| Charm | On the sheet |
|---|---|
| A Drop Amongst the Ocean | ✅ 1 commit dot + in-use icon |
| All-Encompassing Sorcerer's Sight | ✅ 1 commit dot + in-use icon |
| Ambush Sensing Premonition | ✅ 1 commit dot + in-use icon |
| Archive Mind Mentality | ✅ Nothing to build |
| Armored Scout's Invigoration | ✅ Nothing to build |
| Arrow Storm Attack | ✅ Nothing to build |
| Arsenal-Summoning Gesture | Set up with Kaien's charms (2026-10-16) |
| As the Crow Flies | ✅ +1 dot with the Liminal mode; +1 dot with the Sidereal mode |
| Battalion-Breaking Shout | ✅ Nothing to build |
| Battle Plan Rumination | ✅ Nothing to build |
| Beast-Uplifting Harmony | ❓ Question 7 |
| Body Mending Meditation | ✅ 1 commit dot + in-use icon |
| Bulwark Stance | Set up with Kaien's charms (2026-10-16) |
| Bureau-Breaking Method | ✅ +1 dot with the Lunar mode; +1 dot with the Sidereal mode; +1 dot with the Abyssal mode |
| Calling the Rider's Companion | ✅ in-use icon |
| Captivating Battlefield Display | ✅ Nothing to build |
| Cat's Puffed Tail | ✅ Nothing to build |
| Clever Improvisation Method | ✅ Nothing to build |
| Crafty Observation Method | ✅ Nothing to build |
| Cunning Warrior Regimen | ✅ 2 commit dots + in-use icon; +1 dot with the Infernal mode |
| Deft Official's Way | ✅ Nothing to build |
| Distracting Patter Technique | ✅ 1 commit dot + in-use icon |
| Double Distance Technique | ✅ Nothing to build |
| Doubt-Sealing Heist | ✅ 1 commit dot + in-use icon |
| Dragon Coil Technique | ✅ limit 2 |
| Dread Tiger's Symmetry | ✅ 1 commit dot + in-use icon |
| Durability-Enhancing Procedure | ✅ Nothing to build |
| Eagle-Wing Style | ✅ 2 commit dots + in-use icon |
| Efficient Crafting Technique | ✅ Nothing to build |
| Enhanced Senses | Set up with Kaien's charms (2026-10-16) |
| Essence-Lending Method | ✅ Nothing to build |
| Evidence Placing Method | ✅ Nothing to build |
| Evidence-Discerning Method | ✅ Nothing to build |
| Excellent Strike | Set up with Kaien's charms (2026-10-16) |
| Fathoms-Fed Spirit | ✅ 1 commit dot + in-use icon |
| Fearless Vanguard Technique | ✅ 1 commit dot + in-use icon |
| Fists of Iron Technique | Set up with Kaien's charms (2026-10-16) |
| Flawless Brush Discipline | ✅ Nothing to build |
| Flawless Counterfeit Technique | ✅ Nothing to build |
| Flawless Diagnosis Technique | ✅ Nothing to build |
| Flawlessly Impenetrable Disguise | ✅ 1 commit dot + in-use icon; +1 dot with the Solar mode; +1 dot with the Sidereal mode |
| Flickering Shadow Evasion | ✅ Nothing to build |
| Flow Like Blood | ❓ Question 1 — built so far: 1 commit dot + in-use icon |
| Glorious Exalted Bolt | ✅ 1 commit dot + in-use icon; +1 dot with the Solar mode |
| Glorious Presence Technique | Set up with Kaien's charms (2026-10-16) |
| Graceful Crane Stance | ✅ 1 commit dot + in-use icon |
| Greatness-Inspiring Aura | ✅ 1 commit dot + in-use icon |
| Guard-Breaking Technique | ✅ Nothing to build |
| Guarded Mind Meditation | ✅ 1 commit dot + in-use icon |
| Guiding Shadow Shroud | ✅ 1 commit dot + in-use icon |
| Hardship-Surviving Spirit | ✅ 1 commit dot + in-use icon |
| Harmonious Academic Methodology | ✅ 2 commit dots + in-use icon |
| Harmonious Presence Meditation | ✅ 1 commit dot + in-use icon; +1 dot with Majestic Radiant (upgrade) |
| Heaven Thunder Hammer | ✅ Nothing to build |
| Heavenly Guardian Defense | Set up with Kaien's charms (2026-10-16) |
| Hidden Shortcut Revelation | ✅ Nothing to build |
| Illimitable Master Fence | ✅ Nothing to build |
| Immortal Mariner's Advantage | ✅ 1 commit dot + in-use icon |
| Integrity-Protecting Principle | ✅ in-use icon |
| Iron Kettle Body | Set up with Kaien's charms (2026-10-16); now also limit 2 |
| Irresistible Presence Technique | ✅ Nothing to build |
| Jade Leaves a Trail | Set up with Kaien's charms (2026-10-16) |
| League of Iron Preparation | Set up with Kaien's charms (2026-10-16); now also +1 dot with the Infernal mode |
| Lightning Speed | Set up with Kaien's charms (2026-10-16) |
| Listener-Swaying Argument | ✅ Nothing to build |
| Loyal Guardian Approach | ✅ 1 commit dot + in-use icon; Alchemical: Parry, Evasion and Soak +1 while Defend Other is on; Janest: Parry and Evasion +1 while Defend Other is on |
| Malady-Resisting Meditation | ✅ 1 commit dot + in-use icon; limit 2 |
| Many-Attacks Technique | ✅ Nothing to build |
| Master Physician Technique | ✅ 1 commit dot + in-use icon |
| Masterful Performance Exercise | ✅ 1 commit dot + in-use icon; +1 dot with the Solar mode; limit 2 |
| Memetic Dogma Discipline | ✅ Nothing to build |
| Mongoose-and-Cobra Escape | ✅ Nothing to build |
| Monkey Leap Technique | ✅ +1 dot with Soaring Crane Leap (upgrade) |
| Morale-Boosting Meal | ✅ Nothing to build |
| Motive-Discerning Technique | Set up with Kaien's charms (2026-10-16) |
| Mouse Conquers the Lion | ✅ 1 commit dot + in-use icon; +1 dot with the Infernal mode |
| Necromantic Initiation | ✅ limit 3 |
| No Arrow Wasted | ✅ Nothing to build |
| Ox Body Technique | Set up with Kaien's charms (2026-10-16) |
| Panic the Wounded Beast | ✅ Nothing to build |
| Perfect Shadow Stillness | ✅ Nothing to build |
| Phantom Arrow | ✅ 1 commit dot + in-use icon |
| Poetic Expression Style | ✅ 1 commit dot + in-use icon |
| Portentous Warding Defense | Set up with Kaien's charms (2026-10-16) |
| Power Gathering Temper | ✅ Nothing to build |
| Quickening the Forge | ❓ Question 8 — built so far: 2 commit dots + in-use icon |
| Rally the Broken Company | Set up with Kaien's charms (2026-10-16) |
| Reed in the Wind | ✅ Nothing to build |
| Reflex Shot Technique | ✅ Nothing to build |
| Resolve Bolstering Declaration | ✅ Nothing to build |
| Revolving Bow Discipline | ✅ Nothing to build |
| Rider-and-Mount Unity | ✅ +2 dots with the Sidereal mode |
| Righteous Lion Spirit | Set up with Kaien's charms (2026-10-16) |
| Sagacious Reading of Intent | ✅ 1 commit dot + in-use icon |
| Seasoned Criminal Method | ✅ 1 commit dot + in-use icon |
| Second Chance Approach | ✅ 1 commit dot + in-use icon |
| Sharpshooter's Clever Tricks | ✅ 1 commit dot + in-use icon; +1 dot with the Sidereal mode; limit 2; the charm window shows only the modes you picked |
| Sorcerous Initiation | ✅ limit 3 |
| Soul-Stirring Cantata | ✅ 1 commit dot + in-use icon |
| Spirit Strengthens the Skin | ✅ Nothing to build |
| Spirit-Cutting Glance | ✅ 1 commit dot + in-use icon |
| Spirit-Maintaining Maneuver | ✅ Nothing to build |
| Spirit-Manifesting Word | ✅ Nothing to build |
| Spirit-Repelling Diagram | ✅ 1 commit dot + in-use icon; +1 dot with the Dragon-Blooded mode; +1 dot with the Janest mode |
| Spirit-Slaying Stance | ✅ Nothing to build |
| Strange Tongue Understanding | ✅ 1 commit dot + in-use icon |
| Streaming Arrow Stance | ✅ 1 commit dot + in-use icon; Parry and Evasion use Ranged Combat instead of Close Combat and Athletics while in use |
| Stubborn Boar Defense | ✅ in-use icon |
| Subtle Expression Method | ✅ in-use icon |
| Sudden Trap Attack | ✅ Nothing to build |
| Suspicion-Allaying Gesture | ✅ 1 commit dot + in-use icon |
| Swift Artillery Technique | ✅ Nothing to build |
| Swift Counterattack | ✅ +1 dot with the Solar mode; +1 dot with the Abyssal mode; +1 dot with the Infernal mode |
| Swift-Hands Casting | ✅ Nothing to build |
| Ten Ox Meditation | ✅ Nothing to build |
| Terrain-Altering Advantage | ✅ Nothing to build |
| The Perfect Bargain | ✅ 1 commit dot + in-use icon |
| The Perfect Price | ✅ Nothing to build |
| Trackless Region Navigation | ✅ 1 commit dot + in-use icon |
| Truth-Rendering Gaze | ✅ Nothing to build |
| Underling-Promoting Practice | ✅ 2 commit dots + in-use icon |
| Wellness-Restoring Meditation | ✅ 1 commit dot + in-use icon; +1 dot with the Infernal mode |
| Will-Bolstering Method | ✅ Nothing to build |
| Witness Rapport Technique | ✅ 1 commit dot + in-use icon; limit 2 |
| Wonder-Crafting Initiation | ✅ Nothing to build |
| Worshipful Lackey Acquisition | ✅ Nothing to build |
| [Ability] Excellency | Set up with Kaien's charms (2026-10-16) |
