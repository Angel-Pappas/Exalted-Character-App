# Kaien's charms — text and suggested implementation (round 2)

Redone 2026-10-16 under Angel's rules. Nothing here is built yet. Answer the questions,
then approve, change or drop each numbered suggestion.

## Your rules, as I understood them

- No "Use" buttons, and no tracking of steps or of what a charm costs to use: you track that
  yourselves.
- **Commit dots:** a charm that commits motes (forced or optional) shows empty dots on its
  card, one per mote. Clicking one lights it and commits a mote in the Essence panel,
  exactly as if you'd raised Committed by hand.
- **In-use icon:** a charm with an ongoing effect shows an icon you click on and off. If the
  effect changes something on the sheet, it applies only while the icon is on. How long it
  lasts (scene, combat) is up to you.
- **Modes:** every mode in Kaien's charms is owned, except upgrades whose stat requirements
  he doesn't meet yet.
- **"!" mark:** a charm bought more times than its limit, or missing a choice it needs,
  shows an exclamation mark until it's fixed.
- Anything unclear is a question below, not a guess.

## The building blocks

- **B1 — Commit dots.** Empty dots on the card, one per mote the charm commits. Clicking
  an empty dot does what raising Committed by hand does today: 1 mote from Current to
  Committed, and anima +1. If Current is 0, the dot won't light. See **Q1**.
- **B2 — In-use icon.** A small icon on the card of charms with an ongoing effect, off by
  default; click to turn on and off. A sheet effect works only while it's on. A charm whose
  purchase is still in training keeps its effects off, as now.
- **B3 — "!" mark.** On the card and in the charm window, saying what to fix: "Bought 5×;
  the limit is 3 (Essence)" or "A purchase is missing its choice". Checked from:
  - each charm's purchase limit, set once in Admin → Charms (a fixed number, or "Essence",
    or "Physique", etc.);
  - any purchase whose choice isn't made yet (an Excellency's Ability, an Enhanced Senses
    sense, Ox Body's health-level choice).
- **B4 — Which charms have dots or an icon.** Set once per charm in Admin → Charms: how many
  commit dots (forced or optional) and whether it has an in-use icon. That way it works for
  every character, not just Kaien. Each sheet effect (Soak, Defend Other) is coded per
  charm, like Ox Body is now. See **Q4**.

Modes: nothing to build. The charm window already greys out a mode whose requirements
aren't met (e.g. Divine Army Supremacy needs War 5).

## Questions

- **Q1.** Clicking a *lit* dot: should it give the mote back, exactly like lowering
  Committed by hand (1 mote back to Current, anima unchanged)?
- **Q2.** A charm that both commits and has an ongoing effect (Ward of the Sun, Iron Kettle
  Body's commit, Sun King Radiance, Unconquered Sun's Sight, League of Iron Preparation):
  should its lit dots *be* the "in use" state, or should it also get a separate in-use icon?
- **Q3.** Iron Kettle Body: 1 lit dot = +1 Soak and 2 lit dots = +2 Soak?
- **Q4.** OK to set "commit dots / in-use icon / purchase limit" per charm in Admin →
  Charms (B4), so all characters get them?
- **Q5.** Endurance of a Thousand Cuts: the wound penalty is shown as −1, −2…; "add the
  wound penalty to Soak" means Soak +1, +2…, right?
- **Q6.** Fists of Iron already has its own on/off (the FoI button by the Weapons list).
  Keep that, or replace it with the in-use icon on its card?
- **Q7.** Ward of the Sun: while it's in use, should switching on Full Defense also switch
  Defend Other on by itself, or just show a note?
- **Q8.** Righteous Lion Spirit: should the sheet record which Major Intimacy it protects
  (with the "!" until chosen) and mark that Intimacy as unbreakable in the Intimacies panel?
  Or leave it alone?
- **Q9.** Arsenal-Summoning Gesture: the sheet says ×2, and the ledger has 3 purchases
  (Char. Creation + 2 repurchases). Is the third ledger line a mistake, or something else?
- **Q10.** Unconquered Sun's Sight: how many does Kaien really have (sheet ×5, ledger 4,
  limit 3)? And each repurchase names an ally: should the sheet record those names (with
  the "!" until named), or not?
- **Q11.** I earlier suggested some read-only hints: Glorious Presence showing "doubles 8s"
  at Iconic anima, Excellency's dice on hover, Enhanced Senses on the Awareness row, and
  Voice That Holds the Line's Resonant note at Bonfire. Want any of them, or none?
- **Q12.** I left out Arsenal's "Elsewhere" (marking which weapons and armor are banished),
  since it's tracking an action. Want it, or not?

## In short

- **Commit dots:** League of Iron Preparation (2), Iron Kettle Body (2, optional), Ward of
  the Sun (1), Sun King Radiance (1), Unconquered Sun's Sight (1).
- **In-use with a sheet effect:** Endurance of a Thousand Cuts (Soak), Iron Kettle Body's
  commit (Soak), Ward of the Sun (Defend Other). Fists of Iron already has its own.
- **"!" today:** Unconquered Sun's Sight (×5 over a limit of 3).
- **Nothing to build:** the other 15.

---

## 1. Excellent Strike ×1 — Universal, p. 191

> Spend 1 mote on Step 3. Double the extra successes after applying Defense but before any
> bonus successes are applied. Additionally, ignore penalties hindering a single Close Combat
> attack, excluding self-imposed penalties and penalties that cannot be removed.
>
> *Solar mode — Impediment to Opportunity:* Add any penalties ignored by this Charm as
> bonuses to the attack instead.

**Under your rules:** nothing to build. Its cost and step are yours to track, and its Solar mode already shows in the charm window.

## 2. Fists of Iron Technique ×1 — Universal, p. 192 — *already implemented*

> At the start of any combat scene, the Exalt may choose that his unarmed attacks count as
> medium or heavy weapons, rather than light. Spend 1 mote on Step 1 to change this as a
> reflexive action. This does not count as the Exalt's Charm on that step. When activating
> this Charm, also choose one universal or melee tag to apply to the Exalt's unarmed attacks
> while Fists of Iron is active, excluding artifact. […] This may be used during a clash.
>
> *Solar mode — Adamantine Fists of Battle:* Spend an additional mote on activation to grant
> the Exalt's unarmed attacks the artifact tag.

**Under your rules:** it already has its own on/off: the FoI button on the Weapons list, which changes the unarmed weapon while on. See **Q6**.

## 3. Glorious Presence Technique ×1 — Universal, p. 206

> The Exalt doubles 9s on a roll to instill respect, awe, or obedience. If her anima is at the
> Iconic level, she doubles 8s.
>
> *Solar mode — Authority-Radiating Stance:* Until the end of the scene, characters
> successfully influenced gain a two-dice bonus to resist fear while acting on the Solar's
> orders.

**Under your rules:** nothing to build. It is passive and changes nothing on the sheet.

## 4. Jade Leaves a Trail ×1 — Universal, p. 189

> Invoke this Charm while investigating a crime scene, a fraudulent operation, a politician's
> activities, or other similar subject. During this scene, you may spend 1 mote to ask one of
> the following questions. The Storyteller will answer truthfully. Additional questions cost
> 1 mote each.
> • Who does the target work for? • What is not as it seems? • Who benefits the most from the
> actions being investigated? • Has the target recently come into money […]? • To whom did
> the target owe any large debts […]? • If the target keeps an accounting ledger, is there a
> second one tucked away?

**Under your rules:** nothing to build.

## 5. Righteous Lion Spirit ×1 — Universal, p. 199

> Upon learning this Charm, the Exalt strengthens one of her Major Intimacies, making it
> unbreakable. She cannot be forced to act against it by any outside influence — only
> through her own choice may she betray those feelings. Regaining this effect once broken or
> changing the targeted Intimacy requires a dramatic action that qualifies as a major
> Milestone.

**Under your rules:** the book has you choose one Major Intimacy when you learn it, and the sheet doesn't record that choice yet. See **Q8**.

## 6. League of Iron Preparation ×1 — Universal, p. 216

> Commit 2 motes for a scene. With a dramatic scene of drilling and instruction, a group of
> noncombatants or conscripts can be trained to fight competently; they become a battle
> group treated as tertiary Command. As an unrolled Recruitment venture, the Exalt may spend
> a week of downtime in a dramatic scene drilling a unit trained with this Charm, allowing her
> to select one of the following benefits. Each benefit […] can only be applied to a given
> unit once: • Increase their attack pool by two dice. • Gain one additional outnumber
> quality. • Designate Loyalty to the Exalt or a target of her choosing as their Minor Virtue.

**Under your rules:** commits 2 motes (forced). Its upgrade Divine Army Supremacy needs War 5; Kaien has War 4, so it stays locked (the charm window already greys it out).

- **6.1** Two commit dots on the card.

## 7. Rally the Broken Company ×1 — Universal, p. 217

> Spend 1 mote. The Exalt makes a reflexive rout check on behalf of an allied battle group.
> Extra successes on the roll are added to the battle group's next attack as bonus dice.
>
> *Solar mode — Phoenix Banner Resurgence:* The Solar may spend extra successes to heal the
> battle group, trading two successes for each level healed.

**Under your rules:** nothing to build.

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

**Under your rules:** nothing to build. Two purchases is the most this charm allows (the repurchase covers both weapons and armor), and his Weapons/Armor picks are made. See **Q9**.

## 9. Lightning Speed ×1 — Universal, p. 187

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

**Under your rules:** nothing to build. Both upgrades are unlocked by his stats (Racing Hare Method: Athletics 4, Essence 2; Living Wind Approach: Athletics 5, Essence 3), so both count as owned.

## 10. Bulwark Stance ×1 — Universal, p. 193

> Spend 1 mote on Step 2. You may either clear any penalties affecting your Defense or reset
> your Hardness after a concentrated attack.
>
> *Solar mode — Dipping Swallow Defense:* Also increase Defense by 1 for this attack.

**Under your rules:** nothing to build.

## 11. Portentous Warding Defense ×1 — Universal, p. 194

> When attacked, spend 2 motes on Step 2. On Step 4, roll your choice of Attribute + Close
> Combat, and add your successes to your Defense against the attack.

**Under your rules:** nothing to build.

## 12. Iron Kettle Body ×2 — Universal, p. 204

> Spend 1 or 2 motes on Step 7. Against this attack, increase the Exalt's Soak by 1 or 2
> depending on the motes spent. The Exalt may also apply her Soak against environmental
> damage effects that were created by a Charm or other magic.
>
> *Repurchase (Essence 2, bought):* At the Exalt's option, they may commit the motes instead
> and enjoy the Soak increase for the duration of the scene.
> *Solar mode — Adamant Skin Concentration:* The Exalt may apply her increased Soak against
> any environmental damage regardless of source.

**Under your rules:** the repurchase (which Kaien has) lets him *commit* 1 or 2 motes instead and keep the Soak bonus while it lasts. That's optional, and it changes the sheet.

- **12.1** Two optional commit dots on the card.
- **12.2** While dots are lit, Soak gets its own breakdown line, "Iron Kettle Body +1" or "+2". See **Q3**.

## 13. Heavenly Guardian Defense ×1 — Universal, p. 193

> Spend 2 motes. The Exalt applies her Defense against a single instance of a hazard, a trap,
> a disease, a great fall, or some other source of harm that she could not normally apply her
> Defense against. She compares her Defense rating to the difficulty of the hazard. If it is
> the same or greater, she ignores the effects as if she had passed the roll to resist it.
> Once per session, characters can use a Stunt to improvise with this Charm […]. If
> appropriate, mundane weapons may be destroyed by being used to block the environment.
> Special: may be used on any step, in response to any environmental damage, disease, poison,
> trap, or similar hazard. It cannot be used against weapon damage or damage from attacks.

**Under your rules:** nothing to build.

## 14. Evocation: Ward of the Sun ×1 — Solar

> The Exalt can use the shield to shield an ally along with himself. Commit 1 mote for the
> scene: choose an ally within Close Range. When using the Full Defense action, you also use
> the Defend Other action on that ally.

**Under your rules:** commits 1 mote (forced), and it changes the sheet: Full Defense also counts as Defend Other on an ally.

- **14.1** One commit dot on the card.
- **14.2** While it's in use, switching on Full Defense also switches on Defend Other, so the weapon's Defense bonus applies as the sheet already does. See **Q2** and **Q7**.

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

**Under your rules:** nothing to build.

## 16. Sun King Radiance ×1 — Solar, p. 274

> Commit 1 mote. For the scene, gain 2 Power, 1 anima, or 1 Will each time an ally in the same
> scene successfully defends against social influence from a nontrivial enemy. Allies with
> one of the Solar's Intimacies or Virtues in common treat these as Major for the purposes of
> resisting social influence.
>
> *Upgrade — Sun's Rallied Might (not bought):* Allies in the same scene who share his intent
> may add the Solar's Integrity bonus to their Resolve.

**Under your rules:** commits 1 mote (forced). Its upgrade Sun's Rallied Might (Essence 2) is unlocked, so it counts as owned, but it helps allies' Resolve, not Kaien's sheet.

- **16.1** One commit dot on the card.

## 17. Motive-Discerning Technique ×1 — Universal, p. 197

> Invoke this Charm while interacting with another character. During this scene, you may
> spend 1 mote to ask one of the following questions. The Storyteller will answer truthfully.
> Additional questions cost 1 mote each.
> • Does the character feel positively, negatively, or neutrally about me? • Do the character
> and I share a Virtue? • Do the character and I share an Intimacy? • What haven't I noticed
> about the character? • How could I get the character to do what I want?

**Under your rules:** nothing to build. Its upgrade Wise-Eyed Courtier Method (Embassy 4 or Integrity 4) is unlocked, so it counts as owned.

## 18. [Ability] Excellency ×8 — Universal, p. 185 — *partly implemented*

> When purchasing this Charm, choose an Ability. Spend 1 mote. This applies on Step 1 during
> combat. Add bonus dice equal to the Ability's rating to any applicable roll involving the
> chosen Ability. […] You may buy this Charm for multiple Abilities but must choose a new
> Ability each time. This is a full Charm purchase and not a repurchase.
> Special: This Charm may be applied to resistance rolls […] or to reflexively created
> actions […], regardless of Step.

**Under your rules:** already done. The 8 chosen Abilities get the gold Ex mark. It is "!" only if a purchase is missing its Ability (all 8 are chosen).

## 19. Ox Body Technique ×3 — Universal, p. 204 — *already implemented*

> The Exalt increases her base Soak by one. She also gains an additional −1 Health level.
>
> *Repurchase:* You may purchase this a number of times equal to the character's physique.
> The Soak increase only applies once.
> *Solar mode:* The Exalt gains their choice of an additional 0 or two −1 Health levels.

**Under your rules:** already done (+1 Soak once, and health levels per purchase). Limit: Physique (5); he has 3, and all three health-level choices are made.

## 20. Endurance of a Thousand Cuts ×2 — Solar, p. 275

> Spend 1 anima on Step 5. Add the Solar's current wound penalty to her Soak for the scene.
> When her Soak reduces an attack's damage to zero, she gains 1 Power.
>
> *Repurchase — Blade-Cracking Attitude (bought):* Spend 1 anima on step 2 to reduce the
> accuracy or damage rating of her attacker's weapon by one. Artifacts are dulled until the
> start of the Solar's next turn; mundane weapons are permanently damaged.

**Under your rules:** an ongoing effect that changes the sheet. Blade-Cracking Attitude (the repurchase) is a one-off, so nothing there.

- **20.1** An in-use icon on the card.
- **20.2** While in use, Soak gets the line "Endurance of a Thousand Cuts +N", where N is the current wound penalty, and it updates by itself as damage changes. See **Q5**.

## 21. Enhanced Senses ×2 (Sight, Hearing) — Universal, p. 189

> Each purchase of this Charm upgrades their senses: sight, hearing, touch, smell, or taste.
> Double 9s on Awareness rolls related to the enhanced senses.
>
> *Repurchase:* This Charm may be purchased a number of times equal to the Exalt's Essence but
> must be for a different sense each time. If two senses would apply to the same roll, double
> 8s.

**Under your rules:** nothing to build. Limit: Essence (3); he has 2, both senses chosen.

## 22. Unconquered Sun's Sight ×5 — Solar, p. 272

> Commit 1 mote. For the scene, the Solar recognizes when someone uses deception to
> masquerade as something toward which she has an Intimacy. When the player suspects
> falsehood, she may ask the Storyteller, "Are they lying?" or "What is being concealed
> here?" The Storyteller must answer truthfully. This reveals only the falsehood.
>
> *Repurchase — Refracted Light Analysis:* The Solar may purchase this Charm a number of times
> equal to her Essence, each time naming an ally of her Essence or lower, to recognize
> deceptions related to their Intimacies, as well. Whenever an ally benefits from this Charm,
> gain 1 anima.

**Under your rules:** commits 1 mote (forced). **It would get the "!" today:** the live sheet says ×5, but the limit is his Essence (3). The ledger shows 4 purchases.

- **22.1** One commit dot on the card. See **Q10** for the repurchases' named allies.
