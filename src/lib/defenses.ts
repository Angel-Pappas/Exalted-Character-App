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
import type { InventoryItem } from '../types/character'

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
  weaponBonus: number
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

  return {
    parryBase, evasionBase, soakBase, hardnessBase, weaponBonus,
    parry: parryBase + weaponBonus + i.bonus.parry,
    evasion: evasionBase + weaponBonus + i.bonus.evasion,
    soak: soakBase + i.bestArmorSoak + i.bonus.soak,
    hardness: hardnessBase + i.bestArmorHardness + i.bonus.hardness,
    resolve: resolveBase + i.bonus.resolve,
  }
}
