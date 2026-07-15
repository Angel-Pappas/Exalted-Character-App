import { describe, it, expect } from 'vitest'
import { bestEquipped, calculateDefenses, type DefenseInputs } from './defenses'
import type { InventoryItem } from '../types/character'

// Each test states a rule from the book. If one fails, it names the broken rule.

const base: DefenseInputs = {
  stamina: 0, dexterity: 0, closeCombat: 0, athletics: 0, physique: 0, integrity: 0,
  essence: 1, bestWeaponDefense: 0, bestArmorSoak: 0, bestArmorHardness: 0,
  fullDefense: false, defendOther: false,
  bonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 },
}
const inputs = (over: Partial<DefenseInputs> = {}): DefenseInputs => ({ ...base, ...over })

const item = (over: Partial<InventoryItem> & Pick<InventoryItem, 'kind'>): InventoryItem => ({
  id: crypto.randomUUID(), name: '', type: '', equipped: false, ...over,
})

describe('Soak — "1, plus another 1 if your Physique is 3 or higher, plus armor"', () => {
  it('is 1 with no armour and a low Physique', () => {
    expect(calculateDefenses(inputs({ physique: 2 })).soak).toBe(1)
  })

  it('gains the second point exactly at Physique 3, not before', () => {
    expect(calculateDefenses(inputs({ physique: 2 })).soak).toBe(1)
    expect(calculateDefenses(inputs({ physique: 3 })).soak).toBe(2)
    expect(calculateDefenses(inputs({ physique: 5 })).soak).toBe(2) // no further gain
  })

  it('adds the equipped armour\'s Soak on top', () => {
    expect(calculateDefenses(inputs({ physique: 5, bestArmorSoak: 2 })).soak).toBe(4)
  })

  it('ignores Stamina entirely', () => {
    const withStamina = calculateDefenses(inputs({ physique: 1, stamina: 5 })).soak
    const without = calculateDefenses(inputs({ physique: 1, stamina: 0 })).soak
    expect(withStamina).toBe(without)
  })
})

describe('Hardness — "start with 2, plus armor; Exalted add their Essence"', () => {
  it('is 2 plus Essence with no armour', () => {
    expect(calculateDefenses(inputs({ essence: 1 })).hardness).toBe(3)
    expect(calculateDefenses(inputs({ essence: 3 })).hardness).toBe(5)
  })

  it('adds the equipped armour\'s Hardness on top', () => {
    expect(calculateDefenses(inputs({ essence: 3, bestArmorHardness: 1 })).hardness).toBe(6)
  })
})

describe('Resolve — "2; one dot of Integrity makes it 3; Integrity 3+ starts at 4"', () => {
  it('is 2 with no Integrity', () => {
    expect(calculateDefenses(inputs({ integrity: 0 })).resolve).toBe(2)
  })

  it('rises to 3 at a single dot of Integrity', () => {
    expect(calculateDefenses(inputs({ integrity: 1 })).resolve).toBe(3)
    expect(calculateDefenses(inputs({ integrity: 2 })).resolve).toBe(3)
  })

  it('starts at 4 from Integrity 3 upward', () => {
    expect(calculateDefenses(inputs({ integrity: 3 })).resolve).toBe(4)
    expect(calculateDefenses(inputs({ integrity: 5 })).resolve).toBe(4)
  })

  it('is "modified further by Intimacies and Virtues" via the manual bonus box', () => {
    expect(calculateDefenses(inputs({ integrity: 3, bonus: { ...base.bonus, resolve: 2 } })).resolve).toBe(6)
  })

  it('ignores Wits entirely', () => {
    // The stale notes claimed ceil((Wits + Integrity) / 2). The book does not.
    expect(calculateDefenses(inputs({ integrity: 3 })).resolve).toBe(4)
  })
})

describe('Parry — half of Stamina + Close Combat, rounded up', () => {
  it('rounds a half upward', () => {
    expect(calculateDefenses(inputs({ stamina: 2, closeCombat: 3 })).parry).toBe(3) // 2.5 → 3
    expect(calculateDefenses(inputs({ stamina: 5, closeCombat: 5 })).parry).toBe(5)
  })
})

describe('Evasion — half of Dexterity + Athletics, rounded up', () => {
  it('rounds a half upward', () => {
    expect(calculateDefenses(inputs({ dexterity: 3, athletics: 2 })).evasion).toBe(3) // 2.5 → 3
    expect(calculateDefenses(inputs({ dexterity: 3, athletics: 5 })).evasion).toBe(4)
  })
})

describe('A weapon\'s defense only counts while actively defending', () => {
  const armed = { stamina: 5, closeCombat: 5, dexterity: 3, athletics: 5, bestWeaponDefense: 3 }

  it('is ignored when neither Full Defense nor Defend Other is on', () => {
    const d = calculateDefenses(inputs(armed))
    expect(d.parry).toBe(5)
    expect(d.evasion).toBe(4)
  })

  it('applies to both Parry and Evasion on Full Defense', () => {
    const d = calculateDefenses(inputs({ ...armed, fullDefense: true }))
    expect(d.parry).toBe(8)
    expect(d.evasion).toBe(7)
  })

  it('applies on Defend Other too', () => {
    const d = calculateDefenses(inputs({ ...armed, defendOther: true }))
    expect(d.parry).toBe(8)
    expect(d.evasion).toBe(7)
  })

  it('never touches Soak, Hardness or Resolve', () => {
    const off = calculateDefenses(inputs(armed))
    const on = calculateDefenses(inputs({ ...armed, fullDefense: true }))
    expect(on.soak).toBe(off.soak)
    expect(on.hardness).toBe(off.hardness)
    expect(on.resolve).toBe(off.resolve)
  })
})

describe('the manual bonus box is additive on every defence', () => {
  it('adds to each independently', () => {
    const d = calculateDefenses(inputs({ bonus: { parry: 1, evasion: 2, soak: 3, hardness: 4, resolve: 5 } }))
    expect(d.parry).toBe(1)
    expect(d.evasion).toBe(2)
    expect(d.soak).toBe(4)      // 1 base + 3
    expect(d.hardness).toBe(7)  // 2 + Essence 1 + 4
    expect(d.resolve).toBe(7)   // 2 base + 5
  })
})

describe('The Dice Limit — "cannot increase a static value above a margin of five"', () => {
  it('lets gear through untouched while it is within +5', () => {
    // Physique 3 → base 2, armour 5 → exactly at the cap, nothing trimmed.
    const d = calculateDefenses(inputs({ physique: 3, bestArmorSoak: 5 }))
    expect(d.soak).toBe(7)
    expect(d.capped.soak).toBe(false)
  })

  it('trims armour Soak that would exceed +5 over base', () => {
    const d = calculateDefenses(inputs({ physique: 3, bestArmorSoak: 9 }))
    expect(d.soak).toBe(7) // base 2 + capped 5, not 11
    expect(d.capped.soak).toBe(true)
  })

  it('trims armour Hardness that would exceed +5 over base', () => {
    // Essence is part of the base, so it lifts the ceiling rather than competing for it.
    const d = calculateDefenses(inputs({ essence: 3, bestArmorHardness: 8 }))
    expect(d.hardnessBase).toBe(5)
    expect(d.hardness).toBe(10) // 5 + capped 5, not 13
    expect(d.capped.hardness).toBe(true)
  })

  it('trims weapon Defense that would exceed +5, on both Parry and Evasion', () => {
    const d = calculateDefenses(inputs({
      stamina: 5, closeCombat: 5, dexterity: 3, athletics: 5,
      bestWeaponDefense: 8, fullDefense: true,
    }))
    expect(d.parry).toBe(10)   // base 5 + capped 5, not 13
    expect(d.evasion).toBe(9)  // base 4 + capped 5, not 12
    expect(d.capped.parry).toBe(true)
  })

  it('does not cap a weapon that is not actually helping', () => {
    // Full Defense off → the weapon contributes nothing, so nothing is trimmed.
    const d = calculateDefenses(inputs({ stamina: 5, closeCombat: 5, bestWeaponDefense: 99 }))
    expect(d.parry).toBe(5)
    expect(d.capped.parry).toBe(false)
  })

  it('measures the +5 from the base, so a higher base means a higher ceiling', () => {
    // Angel's worked example: base Soak 2 from Physique. Ox Body would raise the base
    // to 3, lifting the ceiling from 7 to 8 — the cap is +5 over base, not an absolute.
    expect(calculateDefenses(inputs({ physique: 3, bestArmorSoak: 99 })).soak).toBe(7)
    expect(calculateDefenses(inputs({ essence: 1, bestArmorHardness: 99 })).hardness).toBe(8)
    expect(calculateDefenses(inputs({ essence: 5, bestArmorHardness: 99 })).hardness).toBe(12)
  })

  it('exempts the manual bonus box from the cap', () => {
    // Angel's call: the box is an override, not a game effect. Ox Body will arrive as a
    // real charm later rather than being faked through here.
    const d = calculateDefenses(inputs({ physique: 3, bonus: { ...base.bonus, soak: 20 } }))
    expect(d.soak).toBe(22)
    expect(d.capped.soak).toBe(false)
  })

  it('caps gear and the manual box independently', () => {
    // Armour trimmed to +5; the box then adds on top of the trimmed total.
    const d = calculateDefenses(inputs({
      physique: 3, bestArmorSoak: 9, bonus: { ...base.bonus, soak: 2 },
    }))
    expect(d.soak).toBe(9) // base 2 + capped 5 + box 2
  })
})

describe('The Dice Limit — "cannot be reduced below one"', () => {
  it('floors a defence that a penalty would push below 1', () => {
    const d = calculateDefenses(inputs({ physique: 5, bonus: { ...base.bonus, soak: -10 } }))
    expect(d.soak).toBe(1)
  })

  it('floors every one of the five', () => {
    const heavy = { parry: -99, evasion: -99, soak: -99, hardness: -99, resolve: -99 }
    const d = calculateDefenses(inputs({
      stamina: 5, closeCombat: 5, dexterity: 5, athletics: 5,
      physique: 5, integrity: 5, essence: 5, bonus: heavy,
    }))
    expect([d.parry, d.evasion, d.soak, d.hardness, d.resolve]).toEqual([1, 1, 1, 1, 1])
  })

  it('leaves a penalty alone when it does not breach the floor', () => {
    const d = calculateDefenses(inputs({ essence: 5, bonus: { ...base.bonus, hardness: -2 } }))
    expect(d.hardness).toBe(5) // 2 + 5 - 2
  })

  it('does not promote a naturally-zero value on a blank sheet', () => {
    // The book limits *reductions*; it does not declare a minimum for a value that is
    // simply small. An untouched new character keeps Parry 0 rather than showing 1.
    const d = calculateDefenses(inputs())
    expect(d.parry).toBe(0)
    expect(d.evasion).toBe(0)
  })
})

describe('bestEquipped — only equipped gear counts, and only the best of it', () => {
  it('is 0 when nothing is equipped', () => {
    expect(bestEquipped([item({ kind: 'weapon', defense: 5 })], 'weapon', 'defense')).toBe(0)
  })

  it('ignores unequipped gear even when it is better', () => {
    const inv = [
      item({ kind: 'weapon', defense: 2, equipped: true }),
      item({ kind: 'weapon', defense: 9, equipped: false }),
    ]
    expect(bestEquipped(inv, 'weapon', 'defense')).toBe(2)
  })

  it('takes the highest among several equipped', () => {
    const inv = [
      item({ kind: 'weapon', defense: 2, equipped: true }),
      item({ kind: 'weapon', defense: 3, equipped: true }),
    ]
    expect(bestEquipped(inv, 'weapon', 'defense')).toBe(3)
  })

  it('does not mix armour into weapons', () => {
    const inv = [
      item({ kind: 'armor', soak: 7, equipped: true }),
      item({ kind: 'weapon', defense: 2, equipped: true }),
    ]
    expect(bestEquipped(inv, 'weapon', 'defense')).toBe(2)
    expect(bestEquipped(inv, 'armor', 'soak')).toBe(7)
  })
})
