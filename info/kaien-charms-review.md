# Kaien's charms — text and suggested implementation

Prepared 2026-10-16 for Angel to review. Nothing here is built yet. Approve, change or drop
each suggestion by its number (e.g. "do G1, G2, 8.1 and 20.1; skip 6.2").

**Training status:** none of Kaien's 22 charms is in training. All of his purchases were
logged before training existed, so every one of them counts as fully trained.

**What the app can't do:** it is a character sheet, not a dice roller. Effects that change a
single roll or attack ("Step 3: double extra successes") can't change the numbers on the
sheet. For those the most useful help is a reminder of when and how to use them, plus the
cost taken off in one click.

Kaien: Solar, Dawn, Essence 3. Anima 10 (Iconic). Motes 10.

---

## Shared building blocks (used by many charms below)

- **G1 — "Use" button with its cost.** In the charm window (and as a small button on the
  card), one click pays the cost from the right pool: motes, anima or Power. Undo is
  available, and the button is greyed out when the pool is too low. Each charm (and each mode)
  needs its cost stored once, in Admin → Charms, as a short field like "1m", "2m",
  "1 anima", "Commit 1m". Used by about 15 of Kaien's charms.
- **G2 — Commit for the scene.** Charms that say "Commit" get an on/off switch. On moves
  the motes into Committed and marks the card as Active (lit border). An **End scene**
  button on the Essence panel releases every scene commitment and ends every scene effect at
  once. Used by 6, 12, 14, 16, 22 (and 20, which lasts the scene but is paid in anima).
- **G3 — Scene effects that change numbers.** While a charm's scene effect is active, it
  adds its own line to the Defenses breakdown (your tooltip rule: own line, e.g. "Endurance
  of a Thousand Cuts +2"), and the number updates by itself. Used by 12.2, 14.1, 20.1.
- **G4 — Combat steps reminder.** A small "Combat steps" pop-up on the sheet listing, for
  each step of an attack, the charms Kaien can use at it, with cost and one-line summary
  (Step 1: Excellency, Voice That Holds the Line · Step 2: Bulwark Stance, Portentous
  Warding Defense, Blade-Cracking Attitude · Step 3: Excellent Strike · Step 5: Endurance
  of a Thousand Cuts · Step 7: Iron Kettle Body). With G1, each line can also be clicked to
  pay the cost.
- **G5 — Owned modes and upgrades.** Kaien's ledger shows modes bought on their own (Five-Direction
  Armaments and Perfected Panoply Selection for Arsenal, Racing Hare Method for Lightning
  Speed, Blade-Cracking Attitude for Endurance). The sheet doesn't record which modes a
  character owns: the charm window shows every mode. Suggestion: "What it bought" in the
  ledger also offers "A mode or upgrade" of an owned charm. The charm window then shows
  owned modes normally and the rest dimmed as "not bought", and G1 offers the owned modes'
  costs. **See question Q1 first.**
- **G6 — Purchase limits.** Repurchase limits from the book are checked when buying (Ox Body
  ≤ Physique, Enhanced Senses ≤ Essence, Unconquered Sun's Sight ≤ Essence), and a
  character already over a limit gets a warning mark (see Q3).

## Questions for you first

- **Q1.** Are a charm's Solar and Dawn modes owned automatically by a Solar, or bought like
  any other mode? Kaien's ledger shows Five-Direction Armaments (Solar) and Perfected Panoply
  Selection (Dawn) each bought for 1 Personal, so it looks like they are bought. In that case
  he does **not** have the Solar modes of Excellent Strike, Fists of Iron, Glorious Presence,
  Rally, Lightning Speed, Bulwark Stance or Iron Kettle Body. Several suggestions below
  depend on this.
- **Q2. Arsenal-Summoning Gesture:** the ledger has 3 purchases (creation + 2 repurchases),
  but the sheet shows ×2 (Weapons, Armor). Which is right?
- **Q3. Unconquered Sun's Sight:** the ledger has 4 purchases (1 + 3 repurchases), the
  sheet shows ×2, and the book allows up to Essence (3). How many does Kaien really have?

---

## 1. Excellent Strike ×1 — Universal, p. 191

> Spend 1 mote on Step 3. Double the extra successes after applying Defense but before any
> bonus successes are applied. Additionally, ignore penalties hindering a single Close Combat
> attack, excluding self-imposed penalties and penalties that cannot be removed.
>
> *Solar mode — Impediment to Opportunity:* Add any penalties ignored by this Charm as
> bonuses to the attack instead.

**Today:** text only.

- **1.1** G1 "Use (1m)" and a Step 3 entry in G4.
- **1.2** If Kaien owns the Solar mode (Q1), show the wound penalty it would turn into bonus
  dice right now (e.g. "ignores −2, +2 instead").

## 2. Fists of Iron Technique ×1 — Universal, p. 192 — *already implemented*

> At the start of any combat scene, the Exalt may choose that his unarmed attacks count as
> medium or heavy weapons, rather than light. Spend 1 mote on Step 1 to change this as a
> reflexive action. This does not count as the Exalt's Charm on that step. When activating
> this Charm, also choose one universal or melee tag to apply to the Exalt's unarmed attacks
> while Fists of Iron is active, excluding artifact. […] This may be used during a clash.
>
> *Solar mode — Adamantine Fists of Battle:* Spend an additional mote on activation to grant
> the Exalt's unarmed attacks the artifact tag.

**Today:** the FoI button on the Weapons list opens a choice of weight, tag and artifact,
which changes the unarmed weapon's stats. It is saved.

- **2.1** Changing the weight mid-combat costs 1 mote (G1); choosing it at the start of the
  scene stays free.
- **2.2** The artifact switch costs 1 extra mote, and only shows if Kaien owns the Solar mode
  (Q1).

## 3. Glorious Presence Technique ×1 — Universal, p. 206

> The Exalt doubles 9s on a roll to instill respect, awe, or obedience. If her anima is at the
> Iconic level, she doubles 8s.
>
> *Solar mode — Authority-Radiating Stance:* Until the end of the scene, characters
> successfully influenced gain a two-dice bonus to resist fear while acting on the Solar's
> orders.

**Today:** text only. It is passive, with no cost.

- **3.1** The card shows a live tag: "Doubles 9s", or "Doubles 8s" while anima is Iconic (10).
- **3.2** The Solar mode's reminder appears only if owned (Q1).

## 4. Jade Leaves a Trail ×1 — Universal, p. 189

> Invoke this Charm while investigating a crime scene, a fraudulent operation, a politician's
> activities, or other similar subject. During this scene, you may spend 1 mote to ask one of
> the following questions. The Storyteller will answer truthfully. Additional questions cost
> 1 mote each.
> • Who does the target work for? • What is not as it seems? • Who benefits the most from the
> actions being investigated? • Has the target recently come into money […]? • To whom did
> the target owe any large debts […]? • If the target keeps an accounting ledger, is there a
> second one tucked away?

**Today:** text only.

- **4.1** The six questions are listed in the charm window as buttons. Clicking one pays
  1 mote (G1) and ticks it as asked for the scene. End scene (G2) clears the ticks.

## 5. Righteous Lion Spirit ×1 — Universal, p. 199

> Upon learning this Charm, the Exalt strengthens one of her Major Intimacies, making it
> unbreakable. She cannot be forced to act against it by any outside influence — only
> through her own choice may she betray those feelings. Regaining this effect once broken or
> changing the targeted Intimacy requires a dramatic action that qualifies as a major
> Milestone.

**Today:** text only. Kaien has 3 Major Intimacies (Blaque, Veyra, Sevrin Esate) and 1
Defining (Solaen).

- **5.1** The charm window lets you pick which Major Intimacy it protects. That Intimacy
  shows a lock and "Unbreakable" in the Intimacies panel.
- **5.2** Deleting or lowering the protected Intimacy asks for confirmation first, with a
  note that changing it needs a major Milestone.

## 6. League of Iron Preparation ×1 — Universal, p. 216

> Commit 2 motes for a scene. With a dramatic scene of drilling and instruction, a group of
> noncombatants or conscripts can be trained to fight competently; they become a battle
> group treated as tertiary Command. As an unrolled Recruitment venture, the Exalt may spend
> a week of downtime in a dramatic scene drilling a unit trained with this Charm, allowing her
> to select one of the following benefits. Each benefit […] can only be applied to a given
> unit once: • Increase their attack pool by two dice. • Gain one additional outnumber
> quality. • Designate Loyalty to the Exalt or a target of her choosing as their Minor Virtue.

**Today:** text only. Kaien's copy has its own text, but it is identical to the library's.

- **6.1** G2 "Commit 2m for the scene".
- **6.2** *(Bigger, later.)* A "Units" list on the sheet: each unit Kaien has trained, with
  the benefits chosen for it (each only once). Battle groups aren't tracked anywhere in the
  app yet, so I'd hold this until battle groups come up more.

## 7. Rally the Broken Company ×1 — Universal, p. 217

> Spend 1 mote. The Exalt makes a reflexive rout check on behalf of an allied battle group.
> Extra successes on the roll are added to the battle group's next attack as bonus dice.
>
> *Solar mode — Phoenix Banner Resurgence:* The Solar may spend extra successes to heal the
> battle group, trading two successes for each level healed.

**Today:** text only.

- **7.1** G1 "Use (1m)". Nothing more without battle-group tracking.

## 8. Arsenal-Summoning Gesture ×2 (Weapons, Armor) — Universal, p. 191

> Spend 1 mote to summon your weapon or armor, or 2 motes to summon both. If the weapon or
> armor in question is within short range, Arsenal-Summoning Gesture is a reflexive action.
> If it is not, Arsenal-Summoning Gesture is a simple action. Spend 1 mote to banish your
> weapon or armor into Elsewhere, a non-space where your arsenal waits to be called upon as
> if it were in short range.
>
> *Repurchase:* This Charm applies to both weapons and armor.
> *Solar mode — Five-Direction Armaments (bought):* The Exalt can store a number of weapons
> or pieces of armor equal to his Essence. If the Charm has been repurchased, he can store
> that amount for each type.
> *Dawn mode — Perfected Panoply Selection (bought):* Spend 1 anima: replace one weapon you
> are currently wielding with another you have banished with Arsenal Summoning Gesture. The
> weapons exchange locations. If you use both weapons in a single turn, you gain 1 Power. If
> you have repurchased Arsenal Summoning Gesture, you can use this mode to replace the armor
> you are currently wearing similarly.

**Today:** text only (it's on the "needs implementation" list).

- **8.1** In the Inventory, each weapon and armor gets a place: **At hand** or **Elsewhere**.
  "Banish" (1m) and "Summon" (1m, or 2m for a weapon and armor together) move it, paying the
  cost.
- **8.2** Five-Direction Armaments: the Elsewhere count shows against its limit, e.g.
  "Elsewhere: weapons 2/3, armor 1/3" (Essence 3, per type because repurchased). It refuses
  past the limit.
- **8.3** Perfected Panoply Selection: a "Swap" button (1 anima) exchanges the wielded weapon
  (or worn armor) with one in Elsewhere, and a "+1 Power" button covers using both weapons in
  a turn.
- **See Q2** (3 purchases in the ledger, ×2 on the sheet).

## 9. Lightning Speed ×1 — Universal, p. 187 — upgrade Racing Hare Method bought

> Spend 1 mote. Double 8s on a movement action involving running or swimming or to any
> venture roll involving foot racing, chases, or swift escapes. This does not apply to
> attacks made following a Rush. If used when moving toward an enemy, the Exalt gains 1
> Power.
>
> *Upgrade — Racing Hare Method (bought; Athletics 4, Essence 2):* Instead, spend 2 motes to
> do one of the following: move three range bands along the ground as a simple movement
> action; quickly sprint to a location within a few days […] to arrive before the end of the
> scene; once per interval, automatically overcome an additional obstacle on a travel venture
> using her speed.
> *Solar mode — Winning Stride Discipline:* If the Exalt succeeds on a roll enhanced by
> Lightning Speed, she may either activate Lightning Speed once again in the same scene at
> no cost or gain 1 Power.

**Today:** text only.

- **9.1** Two G1 buttons: "Use (1m)" and "Toward an enemy (1m, +1 Power)", which pays and
  adds the Power in one click.
- **9.2** A "Racing Hare (2m)" button listing its three choices.
- **9.3** Winning Stride's "free reuse / +1 Power" button, only if owned (Q1).

## 10. Bulwark Stance ×1 — Universal, p. 193

> Spend 1 mote on Step 2. You may either clear any penalties affecting your Defense or reset
> your Hardness after a concentrated attack.
>
> *Solar mode — Dipping Swallow Defense:* Also increase Defense by 1 for this attack.

**Today:** text only.

- **10.1** G1 "Use (1m)" and a Step 2 entry in G4.
- **10.2** If the Solar mode is owned (Q1), the reminder says "+1 Defense for this attack".

## 11. Portentous Warding Defense ×1 — Universal, p. 194

> When attacked, spend 2 motes on Step 2. On Step 4, roll your choice of Attribute + Close
> Combat, and add your successes to your Defense against the attack.

**Today:** text only.

- **11.1** G1 "Use (2m)" and a Step 2 entry in G4.
- **11.2** The window shows the best pool to roll right now, using trained ratings: e.g.
  "Stamina 5 + Close Combat 5 = 10 dice (Excellency: +5 for 1m)".

## 12. Iron Kettle Body ×2 — Universal, p. 204

> Spend 1 or 2 motes on Step 7. Against this attack, increase the Exalt's Soak by 1 or 2
> depending on the motes spent. The Exalt may also apply her Soak against environmental
> damage effects that were created by a Charm or other magic.
>
> *Repurchase (Essence 2, bought):* At the Exalt's option, they may commit the motes instead
> and enjoy the Soak increase for the duration of the scene.
> *Solar mode — Adamant Skin Concentration:* The Exalt may apply her increased Soak against
> any environmental damage regardless of source.

**Today:** text only. Kaien's copy has its own text, identical to the library's.

- **12.1** Two G1 buttons for one attack: "+1 Soak (1m)" and "+2 Soak (2m)", with a Step 7
  entry in G4.
- **12.2** Repurchase: "Commit 1m / 2m for the scene". While committed, Soak goes up by 1 or
  2 with its own breakdown line, "Iron Kettle Body +2" (G2 + G3).

## 13. Heavenly Guardian Defense ×1 — Universal, p. 193

> Spend 2 motes. The Exalt applies her Defense against a single instance of a hazard, a trap,
> a disease, a great fall, or some other source of harm that she could not normally apply her
> Defense against. She compares her Defense rating to the difficulty of the hazard. If it is
> the same or greater, she ignores the effects as if she had passed the roll to resist it.
> Once per session, characters can use a Stunt to improvise with this Charm […]. If
> appropriate, mundane weapons may be destroyed by being used to block the environment.
> Special: may be used on any step, in response to any environmental damage, disease, poison,
> trap, or similar hazard. It cannot be used against weapon damage or damage from attacks.

**Today:** text only.

- **13.1** G1 "Use (2m)". The window shows Kaien's current Parry and Evasion to compare
  against the hazard's difficulty.
- **13.2** A "Stunt used this session" tick (cleared by hand).

## 14. Evocation: Ward of the Sun ×1 — Solar

> The Exalt can use the shield to shield an ally along with himself. Commit 1 mote for the
> scene: choose an ally within Close Range. When using the Full Defense action, you also use
> the Defend Other action on that ally.

**Today:** text only. The sheet already has Full Defense and Defend Other switches.

- **14.1** G2 "Commit 1m", asking which ally (a name). While it's committed, switching on
  Full Defense also switches on Defend Other, so the weapon's Defense bonus applies as the
  sheet already handles. The Defenses panel shows "Also defending: <ally>".

## 15. Evocation: Voice That Holds the Line ×1 — Solar

> Kaien may activate this Evocation when he makes a War roll to command, rally, direct, or
> coordinate allies, including during a warfare venture or when commanding a battle group.
> Spend 1 mote on step 1. He gains one automatic success on the roll. This success does not
> count toward the limit.
> In combat, if an allied battle group within short range fails a rout check, Kaien may
> activate this Evocation reflexively. The battle group treats the rout check as successful
> instead, and gains +1 Defense until Kaien's next turn […].
>
> *Resonant — Solar / Orichalcum:* If Kaien's anima is at Bonfire or Iconic, or if he is
> defending a cause tied to one of his Major or Defining Intimacies, the protected battle
> group also gains 1 Power.

**Today:** text only.

- **15.1** G1 "Use (1m)" and a Step 1 entry in G4.
- **15.2** While anima is Bonfire or Iconic (7+), the card shows "Resonant: the group also
  gains 1 Power".

## 16. Sun King Radiance ×1 — Solar, p. 274

> Commit 1 mote. For the scene, gain 2 Power, 1 anima, or 1 Will each time an ally in the same
> scene successfully defends against social influence from a nontrivial enemy. Allies with
> one of the Solar's Intimacies or Virtues in common treat these as Major for the purposes of
> resisting social influence.
>
> *Upgrade — Sun's Rallied Might (not bought):* Allies in the same scene who share his intent
> may add the Solar's Integrity bonus to their Resolve.

**Today:** text only.

- **16.1** G2 "Commit 1m". While it's active, the card shows three quick buttons: "+2 Power",
  "+1 anima" and "+1 Will", one click per ally who resists.

## 17. Motive-Discerning Technique ×1 — Universal, p. 197

> Invoke this Charm while interacting with another character. During this scene, you may
> spend 1 mote to ask one of the following questions. The Storyteller will answer truthfully.
> Additional questions cost 1 mote each.
> • Does the character feel positively, negatively, or neutrally about me? • Do the character
> and I share a Virtue? • Do the character and I share an Intimacy? • What haven't I noticed
> about the character? • How could I get the character to do what I want?

**Today:** text only.

- **17.1** The same as 4.1: questions as buttons, 1 mote each, ticked for the scene.

## 18. [Ability] Excellency ×8 — Universal, p. 185 — *partly implemented*

> When purchasing this Charm, choose an Ability. Spend 1 mote. This applies on Step 1 during
> combat. Add bonus dice equal to the Ability's rating to any applicable roll involving the
> chosen Ability. […] You may buy this Charm for multiple Abilities but must choose a new
> Ability each time. This is a full Charm purchase and not a repurchase.
> Special: This Charm may be applied to resistance rolls […] or to reflexively created
> actions […], regardless of Step.

**Kaien's picks:** Close Combat, Embassy, Integrity, Physique, Presence, War, Athletics,
Awareness.

**Today:** those 8 Abilities are highlighted with a gold Ex dot.

- **18.1** Resting the mouse on an Ex dot says what it gives now: "Excellency: +5 dice for
  1m" (the Ability's trained rating).
- **18.2** Clicking the Ex dot pays 1 mote (G1, with undo).

## 19. Ox Body Technique ×3 — Universal, p. 204 — *implemented*

> The Exalt increases her base Soak by one. She also gains an additional −1 Health level.
>
> *Repurchase:* You may purchase this a number of times equal to the character's physique.
> The Soak increase only applies once.
> *Solar mode:* The Exalt gains their choice of an additional 0 or two −1 Health levels.

**Today:** done. +1 Soak once (its own line in the Soak breakdown), and per purchase the
Solar choice of a 0 level or two −1 levels on the health track.

- **19.1** Only G6: limit purchases to Physique (5). Kaien has 3, so he's fine.

## 20. Endurance of a Thousand Cuts ×2 — Solar, p. 275 — repurchase Blade-Cracking Attitude bought

> Spend 1 anima on Step 5. Add the Solar's current wound penalty to her Soak for the scene.
> When her Soak reduces an attack's damage to zero, she gains 1 Power.
>
> *Repurchase — Blade-Cracking Attitude (bought):* Spend 1 anima on step 2 to reduce the
> accuracy or damage rating of her attacker's weapon by one. Artifacts are dulled until the
> start of the Solar's next turn; mundane weapons are permanently damaged.

**Today:** text only. The sheet already knows the current wound penalty from the health
track.

- **20.1** "Activate (1 anima)": for the scene, Soak gains a line "Endurance of a Thousand
  Cuts +N", where N is the current wound penalty. It updates by itself as damage changes and
  ends with End scene (G2 + G3).
- **20.2** While active, a "+1 Power" quick button for when Soak stops all damage.
- **20.3** Blade-Cracking Attitude: G1 "Use (1 anima)" and a Step 2 entry in G4.

## 21. Enhanced Senses ×2 (Sight, Hearing) — Universal, p. 189

> Each purchase of this Charm upgrades their senses: sight, hearing, touch, smell, or taste.
> Double 9s on Awareness rolls related to the enhanced senses.
>
> *Repurchase:* This Charm may be purchased a number of times equal to the Exalt's Essence but
> must be for a different sense each time. If two senses would apply to the same roll, double
> 8s.

**Today:** text only. It's passive.

- **21.1** Resting the mouse on the Awareness row says "Double 9s with Sight or Hearing;
  double 8s when both apply".
- **21.2** G6: limited to Essence (3); Kaien has 2.

## 22. Unconquered Sun's Sight ×2 — Solar, p. 272

> Commit 1 mote. For the scene, the Solar recognizes when someone uses deception to
> masquerade as something toward which she has an Intimacy. When the player suspects
> falsehood, she may ask the Storyteller, "Are they lying?" or "What is being concealed
> here?" The Storyteller must answer truthfully. This reveals only the falsehood.
>
> *Repurchase — Refracted Light Analysis:* The Solar may purchase this Charm a number of times
> equal to her Essence, each time naming an ally of her Essence or lower, to recognize
> deceptions related to their Intimacies, as well. Whenever an ally benefits from this Charm,
> gain 1 anima.

**Today:** text only.

- **22.1** G2 "Commit 1m".
- **22.2** Each repurchase names an ally, chosen when buying (like Ox Body's per-purchase
  choice). The window lists the named allies, with a "+1 anima" quick button for when one
  benefits.
- **See Q3** (4 purchases in the ledger, ×2 on the sheet, book limit 3).

---

## My suggested order

1. Answer Q1–Q3.
2. **G1, G2 and G4.** These three help almost every charm above at once.
3. The ones that change numbers: **20.1, 12.2, 14.1** (with G3).
4. The small, clear wins: **3.1, 5.1, 8.1–8.3, 15.2, 16.1, 18.1, 18.2, 21.1**.
5. Later: **6.2** (battle groups), **G5** (owned modes, once Q1 is answered), **G6**.
