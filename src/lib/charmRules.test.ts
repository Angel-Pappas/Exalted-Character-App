import { describe, it, expect } from 'vitest'
import {
  abilityRank, baseAbility, exaltTypeBase, isModeInScope, isTypeInScope,
  modeIcon, modeLockReasons, parsePrereqAbility, sortAbilities, sortModes,
} from './charmRules'
import type { AbilityData, CharmMode } from '../types/character'

// These tests exist to pin down the game rules, not to describe the code. Each one
// states a rule Angel would recognize from the table, so if a future change breaks
// a rule, the failure says which rule — not which line.

const ability = (rating: number): AbilityData => ({ rating, specialty: '', excellency: false })
const mode = (over: Partial<CharmMode> = {}): CharmMode => ({
  label: 'Solar', text: null, prerequisiteAbilities: [], prerequisiteEssence: null, ...over,
})

describe('exaltTypeBase', () => {
  it('strips the "Exalted" suffix the sheet stores but the charm library omits', () => {
    expect(exaltTypeBase('Solar Exalted')).toBe('solar')
    expect(exaltTypeBase('Dragon-Blooded')).toBe('dragon-blooded')
  })
})

describe('baseAbility', () => {
  it('strips a parenthetical qualifier', () => {
    expect(baseAbility('Athletics (Style)')).toBe('Athletics')
    expect(baseAbility('Close Combat')).toBe('Close Combat')
  })
})

describe('isTypeInScope — which charms a character can see', () => {
  it('always shows Universal and Martial Arts', () => {
    expect(isTypeInScope('Universal', 'Solar Exalted', false)).toBe(true)
    expect(isTypeInScope('Martial Arts', 'Solar Exalted', false)).toBe(true)
  })

  it('shows the character\'s own type and hides other types', () => {
    expect(isTypeInScope('Solar', 'Solar Exalted', false)).toBe(true)
    expect(isTypeInScope('Lunar', 'Solar Exalted', false)).toBe(false)
  })

  it('shows everything when Show All is on', () => {
    expect(isTypeInScope('Lunar', 'Solar Exalted', true)).toBe(true)
  })

  it('treats a blank type as Universal rather than hiding it', () => {
    expect(isTypeInScope('', 'Solar Exalted', false)).toBe(true)
  })
})

describe('isModeInScope — which modes of a charm apply', () => {
  it('always shows Upgrade and Repurchase, whatever the type', () => {
    expect(isModeInScope('Upgrade', 'Lunar Exalted', 'Full Moon', false)).toBe(true)
    expect(isModeInScope('Repurchase', 'Lunar Exalted', 'Full Moon', false)).toBe(true)
  })

  it('hides another Exalt type\'s mode', () => {
    expect(isModeInScope('Lunar', 'Solar Exalted', 'Dawn', false)).toBe(false)
  })

  it('shows a multi-type mode when the character is any one of the listed types', () => {
    const label = 'Alchemical, Getimian, Lunar, and Liminal'
    expect(isModeInScope(label, 'Lunar Exalted', '', false)).toBe(true)
    expect(isModeInScope(label, 'Solar Exalted', '', false)).toBe(false)
  })

  it('shows the character\'s own caste and hides a rival caste', () => {
    expect(isModeInScope('Fire', 'Dragon-Blooded', 'Fire', false)).toBe(true)
    expect(isModeInScope('Water', 'Dragon-Blooded', 'Fire', false)).toBe(false)
  })

  it('defaults an unrecognized one-off mode name to visible', () => {
    // e.g. Sharpshooter's Clever Tricks — a named mode with no type restriction.
    // A strict allowlist would wrongly hide these.
    expect(isModeInScope("Sharpshooter's Clever Tricks", 'Solar Exalted', 'Dawn', false)).toBe(true)
  })
})

describe('parsePrereqAbility', () => {
  it('parses an ability name and its minimum rating', () => {
    expect(parsePrereqAbility('Integrity 2')).toEqual({ name: 'Integrity', min: 2 })
    expect(parsePrereqAbility('Ranged Combat 4')).toEqual({ name: 'Ranged Combat', min: 4 })
  })

  it('returns null on text it cannot read, so callers do not lock over it', () => {
    expect(parsePrereqAbility('Essence')).toBeNull()
    expect(parsePrereqAbility('')).toBeNull()
  })
})

describe('modeLockReasons — what stops a mode being usable', () => {
  const abilities: Record<string, AbilityData> = { Integrity: ability(1), 'Close Combat': ability(5) }

  it('reports nothing when every requirement is met', () => {
    const m = mode({ prerequisiteEssence: 2, prerequisiteAbilities: ['Close Combat 3'] })
    expect(modeLockReasons(m, [m], 1, 3, abilities)).toEqual([])
  })

  it('locks on Essence below the requirement', () => {
    const m = mode({ prerequisiteEssence: 4 })
    expect(modeLockReasons(m, [m], 1, 2, abilities)).toEqual(['Essence 4'])
  })

  it('locks on an ability rated below the requirement', () => {
    const m = mode({ prerequisiteAbilities: ['Integrity 3'] })
    expect(modeLockReasons(m, [m], 1, 5, abilities)).toEqual(['Integrity 3'])
  })

  it('does not lock over an ability this app does not track', () => {
    // Alchemical Force/Finesse/Fortitude are not among the 14 abilities.
    const m = mode({ prerequisiteAbilities: ['Force 3'] })
    expect(modeLockReasons(m, [m], 1, 5, abilities)).toEqual([])
  })

  it('reports every unmet requirement at once', () => {
    const m = mode({ prerequisiteEssence: 5, prerequisiteAbilities: ['Integrity 3'] })
    expect(modeLockReasons(m, [m], 1, 1, abilities)).toEqual(['Essence 5', 'Integrity 3'])
  })

  describe('Repurchase needs the charm bought enough times', () => {
    it('locks a single Repurchase until the charm is owned twice', () => {
      const m = mode({ label: 'Repurchase' })
      expect(modeLockReasons(m, [m], 1, 5, abilities)).toEqual(['Repurchase'])
      expect(modeLockReasons(m, [m], 2, 5, abilities)).toEqual([])
    })

    it('tiers stacked Repurchases by ascending Essence, whatever order the DB returns', () => {
      // Sorcerous Initiation: an Essence 3 tier then an Essence 5 tier. Listed here
      // in reverse to prove the tiering sorts rather than trusting DB order.
      const high = mode({ label: 'Repurchase', prerequisiteEssence: 5 })
      const low = mode({ label: 'Repurchase', prerequisiteEssence: 3 })
      const all = [high, low]

      // At Essence 5 owning 2 copies: the first tier is live, the second still needs a 3rd.
      expect(modeLockReasons(low, all, 2, 5, abilities)).toEqual([])
      expect(modeLockReasons(high, all, 2, 5, abilities)).toEqual(['Repurchase'])

      // A 3rd copy unlocks the second tier.
      expect(modeLockReasons(high, all, 3, 5, abilities)).toEqual([])
    })
  })
})

describe('sorting', () => {
  it('leads ability lists with Excellency and trails them with Styles', () => {
    expect(sortAbilities(['War', 'Athletics (Style)', 'Excellency', 'Integrity']))
      .toEqual(['Excellency', 'Integrity', 'War', 'Athletics (Style)'])
  })

  it('ranks Excellency first even when qualified', () => {
    expect(abilityRank('Excellency (Any)')).toBe(0)
  })

  it('orders modes Upgrade, then Repurchase, then Solar, then the rest alphabetically', () => {
    const labels = sortModes([mode({ label: 'Lunar' }), mode({ label: 'Solar' }),
      mode({ label: 'Repurchase' }), mode({ label: 'Upgrade' }), mode({ label: 'Abyssal' })])
      .map(m => m.label)
    expect(labels).toEqual(['Upgrade', 'Repurchase', 'Solar', 'Abyssal', 'Lunar'])
  })

  it('gives unrecognized mode labels a fallback glyph rather than failing', () => {
    expect(modeIcon('Solar').glyph).toBe('☀')
    expect(modeIcon('Some One-Off Name').glyph).toBe('◆')
  })
})
