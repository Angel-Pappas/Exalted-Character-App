import { describe, it, expect } from 'vitest'
import { boughtOnSheet, undoBought } from './ledgerRemoval'
import type { AbilityData, CharacterCharm, MilestoneTransaction, TraitPurchase } from '../types/character'

// Angel, 2026-10-16: deleting a ledger line whose purchase is still in training
// takes the purchase off the sheet too; once trained, the player is asked.

const charm = (count = 1, picks?: string[]): CharacterCharm => ({
  id: 'c1', libraryId: 'ipp', name: 'Integrity-Protecting Principle', libraryDescription: '', libraryModes: [],
  libraryMechanicalKey: null, customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, count, picks,
})
const line = (extra: Partial<MilestoneTransaction>): MilestoneTransaction => ({
  id: 'l1', kind: 'purchase', personal: 0, exalted: 1, minor: 0, major: 0, description: 'x', date: '2026-10-16', training: true, ...extra,
})
const charmLine = line({ charm: { libraryId: 'ipp', name: 'Integrity-Protecting Principle' } })
const traitLine = (trait: TraitPurchase) => line({ trait })
const ability = (rating: number, specialty = ''): AbilityData => ({ rating, specialty, excellency: false })
const sheet = (over: Partial<{ charms: CharacterCharm[]; attributes: Record<string, number>; abilities: Record<string, AbilityData> }> = {}) =>
  ({ charms: [], attributes: {}, abilities: {}, ...over })

describe('boughtOnSheet', () => {
  it('names the charm a line bought, while it is on the sheet', () => {
    expect(boughtOnSheet(charmLine, sheet({ charms: [charm()] }))).toBe('Integrity-Protecting Principle')
    expect(boughtOnSheet(charmLine, sheet({ charms: [charm(2)] }))).toBe('one purchase of Integrity-Protecting Principle')
    expect(boughtOnSheet(charmLine, sheet())).toBeNull()
  })

  it('names dots and specialties still on the sheet', () => {
    expect(boughtOnSheet(traitLine({ kind: 'ability', name: 'War', dots: 2 }), sheet({ abilities: { War: ability(3) } }))).toBe('2 War dots')
    expect(boughtOnSheet(traitLine({ kind: 'attribute', name: 'Wits', dots: 1 }), sheet({ attributes: { Wits: 2 } }))).toBe('1 Wits dot')
    expect(boughtOnSheet(traitLine({ kind: 'attribute', name: 'Wits', dots: 1 }), sheet({ attributes: { Wits: 0 } }))).toBeNull()
    const spec = traitLine({ kind: 'specialty', name: 'War', specialty: 'Sieges' })
    expect(boughtOnSheet(spec, sheet({ abilities: { War: ability(3, 'Sieges') } }))).toBe('the War specialty (Sieges)')
    expect(boughtOnSheet(spec, sheet({ abilities: { War: ability(3, 'Naval') } }))).toBeNull()
  })

  it('is null for a line that bought nothing on the sheet', () => {
    expect(boughtOnSheet(line({ kind: 'gain' }), sheet({ charms: [charm()] }))).toBeNull()
  })
})

describe('undoBought', () => {
  it('takes a charm bought once off the sheet', () => {
    expect(undoBought(charmLine, sheet({ charms: [charm()] }))).toEqual({ charms: [] })
  })

  it('takes one purchase off a charm bought more than once, with its pick', () => {
    const after = undoBought(charmLine, sheet({ charms: [charm(2, ['War', 'Awareness'])] }))
    expect(after.charms).toEqual([{ ...charm(1, ['War']) }])
  })

  it('changes nothing when the charm is already gone', () => {
    expect(undoBought(charmLine, sheet())).toEqual({})
  })

  it('takes the dots back, never below 0', () => {
    expect(undoBought(traitLine({ kind: 'ability', name: 'War', dots: 2 }), sheet({ abilities: { War: ability(3, 'Sieges') } })))
      .toEqual({ abilities: { War: ability(1, 'Sieges') } })
    expect(undoBought(traitLine({ kind: 'attribute', name: 'Wits', dots: 2 }), sheet({ attributes: { Wits: 1, Strength: 3 } })))
      .toEqual({ attributes: { Wits: 0, Strength: 3 } })
  })

  it('clears the specialty it set, and leaves one the player has since changed', () => {
    const spec = traitLine({ kind: 'specialty', name: 'War', specialty: 'Sieges' })
    expect(undoBought(spec, sheet({ abilities: { War: ability(3, 'Sieges') } }))).toEqual({ abilities: { War: ability(3) } })
    expect(undoBought(spec, sheet({ abilities: { War: ability(3, 'Naval') } }))).toEqual({ abilities: { War: ability(3, 'Naval') } })
  })
})
