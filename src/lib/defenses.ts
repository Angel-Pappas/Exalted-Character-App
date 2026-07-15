// The five defence calculations, as pure arithmetic. Lifted out of SheetTab's render
// so defenses.test.ts can pin them to the book text quoted below.
//
// Book wording, verbatim, so nobody has to re-derive these from the code:
//
//   Soak     — "Without armor, your Soak is 1, plus another 1 if your Physique is 3
//               or higher. If you are wearing armor, add its Soak value to this total."
//   Hardness — "Characters start with Hardness 2 plus any applicable bonuses from
//               armor. Exalted characters add their Essence rating to their Hardness."
//   Resolve  — "A character's Resolve is 2. If she has one dot of Integrity, this
//               increases to 3 and if her Integrity is 3 or higher, this starts at 4.
//               It is modified further by her Intimacies and Virtues."
//
// Intimacies/Virtues are not modelled as data — they arrive through `bonus`, the
// manual box on the Defenses panel.
//
// ── The Dice Limit, as it applies to static values ──
// Book: "If something increases a static value — such as Soak or Defense — treat this as
// though they were added successes. Therefore, anything that increases a static value
// above its base value cannot increase it above a margin of five." And for penalties:
// "If something would reduce a static value (including difficulty) this cannot be
// reduced below one."
//
// So: value = base + min(5, gearBonus) + manualBonus, floored at 1 if pushed under.
//
// Two deliberate decisions from Angel (2026-07-16):
//  - Essence counts as part of Hardness's BASE (so it lifts the ceiling), not as a
//    bonus competing for the +5.
//  - The manual bonus box is EXEMPT from the cap. It's an override, not a game effect.
//    Ox Body and friends raise the base, but they'll arrive as real charm
//    implementations later rather than being faked through this box.
// Which leaves gear as the only capped source today: armour Soak/Hardness, and weapon
// Defense on Parry/Evasion. Resolve has no capped source yet — its cap cannot bite
// until charms feed it one. The machinery is wired for all five regardless.
import type { InventoryItem } from '../types/character'

/** "cannot increase it above a margin of five" */
export const STATIC_BONUS_CAP = 5
/** "this cannot be reduced below one" */
export const STATIC_VALUE_FLOOR = 1

export interface DefenseInputs {
  stamina: number
  dexterity: number
  closeCombat: number
  athletics: number
  physique: number
  integrity: number
  essence: number
  /** Highest defense among equipped weapons — only counts on Full Defense / Defend Other. */
  bestWeaponDefense: number
  bestArmorSoak: number
  bestArmorHardness: number
  fullDefense: boolean
  defendOther: boolean
  bonus: { parry: number; evasion: number; soak: number; hardness: number; resolve: number }
}

export interface DefenseResult {
  parry: number
  evasion: number
  soak: number
  hardness: number
  resolve: number
  /** Exposed for the panel's tooltips, which explain where each number came from. */
  parryBase: number
  evasionBase: number
  soakBase: number
  hardnessBase: number
  resolveBase: number
  /** Weapon defense actually applied — 0 unless Full Defense / Defend Other is on. */
  weaponBonus: number
  /** Which defences had gear trimmed by the +5 cap, so the panel can say so. */
  capped: { parry: boolean; evasion: boolean; soak: boolean; hardness: boolean; resolve: boolean }
}

/**
 * base + min(5, gearBonus) + manualBonus, floored at 1.
 *
 * The floor only applies when something actually *reduced* the value — the book limits
 * reductions ("cannot be reduced below one"), it does not declare a minimum for a value
 * that is simply small. A blank sheet with every stat at 0 therefore still shows Parry 0
 * rather than being quietly promoted to 1.
 */
function applyLimits(base: number, gearBonus: number, manualBonus: number): { value: number; capped: boolean } {
  const allowedGear = Math.min(STATIC_BONUS_CAP, gearBonus)
  const modifiers = allowedGear + manualBonus
  const raw = base + modifiers
  return {
    value: modifiers < 0 ? Math.max(STATIC_VALUE_FLOOR, raw) : raw,
    capped: gearBonus > STATIC_BONUS_CAP,
  }
}

/** Best value of a numeric field across the equipped items of one kind. 0 if none equipped. */
export function bestEquipped(
  inventory: InventoryItem[],
  kind: InventoryItem['kind'],
  field: 'defense' | 'soak' | 'hardness',
): number {
  const equipped = inventory.filter(i => i.kind === kind && i.equipped)
  return equipped.length ? Math.max(...equipped.map(i => i[field] ?? 0)) : 0
}

export function calculateDefenses(i: DefenseInputs): DefenseResult {
  const parryBase = Math.ceil((i.stamina + i.closeCombat) / 2)
  const evasionBase = Math.ceil((i.dexterity + i.athletics) / 2)
  const soakBase = 1 + (i.physique >= 3 ? 1 : 0)
  const hardnessBase = 2 + i.essence
  const resolveBase = i.integrity >= 3 ? 4 : i.integrity >= 1 ? 3 : 2

  // A weapon's defense only helps while actively defending.
  const weaponBonus = i.fullDefense || i.defendOther ? i.bestWeaponDefense : 0

  const parry = applyLimits(parryBase, weaponBonus, i.bonus.parry)
  const evasion = applyLimits(evasionBase, weaponBonus, i.bonus.evasion)
  const soak = applyLimits(soakBase, i.bestArmorSoak, i.bonus.soak)
  const hardness = applyLimits(hardnessBase, i.bestArmorHardness, i.bonus.hardness)
  // No capped source feeds Resolve yet — Intimacies/Virtues come through the manual box,
  // which is exempt. Routed through applyLimits anyway so the floor applies and so a
  // future charm bonus has somewhere to land.
  const resolve = applyLimits(resolveBase, 0, i.bonus.resolve)

  return {
    parryBase, evasionBase, soakBase, hardnessBase, resolveBase, weaponBonus,
    parry: parry.value,
    evasion: evasion.value,
    soak: soak.value,
    hardness: hardness.value,
    resolve: resolve.value,
    capped: {
      parry: parry.capped, evasion: evasion.capped, soak: soak.capped,
      hardness: hardness.capped, resolve: resolve.capped,
    },
  }
}
