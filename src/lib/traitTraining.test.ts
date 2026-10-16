import { describe, it, expect } from 'vitest'
import { applyTrait, traitDescription, trainedAbilities, trainedAttributes, traitTraining } from './traitTraining'
import type { MilestoneTransaction, TraitPurchase } from '../types/character'

// Angel, 2026-10-16: dots and specialties bought with milestones go on the sheet
// straight away but, like charms, only count once their training is done.

const line = (id: string, trait: TraitPurchase, training = true): MilestoneTransaction => ({
  id, kind: 'purchase', personal: 2, exalted: 0, minor: 0, major: 0, description: '', date: '2026-10-10', trait, ...(training ? { training } : {}),
})
const sheet = {
  attributes: { Stamina: 3 },
  abilities: { Awareness: { rating: 2, specialty: '', excellency: false } },
}

describe('buying a trait changes the sheet at once', () => {
  it('raises an ability by the dots bought', () => {
    expect(applyTrait(sheet, { kind: 'ability', name: 'Awareness', dots: 2 }).abilities.Awareness.rating).toBe(4)
  })

  it('raises an attribute, keeping the others', () => {
    const next = applyTrait({ ...sheet, attributes: { Stamina: 3, Wits: 2 } }, { kind: 'attribute', name: 'Stamina', dots: 1 })
    expect(next.attributes).toEqual({ Stamina: 4, Wits: 2 })
  })

  it('starts an ability the sheet has no entry for from 0', () => {
    expect(applyTrait(sheet, { kind: 'ability', name: 'War', dots: 1 }).abilities.War).toEqual({ rating: 1, specialty: '', excellency: false })
  })

  it('sets the specialty (one per ability)', () => {
    expect(applyTrait(sheet, { kind: 'specialty', name: 'Awareness', specialty: 'Ambushes' }).abilities.Awareness.specialty).toBe('Ambushes')
  })

  it('describes the purchase for the ledger', () => {
    expect(traitDescription({ kind: 'ability', name: 'Awareness', dots: 1 }, 2)).toBe('Awareness 2→3')
    expect(traitDescription({ kind: 'specialty', name: 'War', specialty: 'Sieges' }, 0)).toBe('Specialty: War (Sieges)')
  })
})

describe('dots in training do not count yet', () => {
  const ledger = [
    line('a', { kind: 'ability', name: 'Awareness', dots: 1 }),
    line('b', { kind: 'ability', name: 'Awareness', dots: 2 }),
    line('c', { kind: 'attribute', name: 'Stamina', dots: 1 }),
    line('d', { kind: 'specialty', name: 'Awareness', specialty: 'Ambushes' }),
    line('old', { kind: 'attribute', name: 'Stamina', dots: 1 }, false),
  ]

  it('adds up what is still training, per trait', () => {
    const t = traitTraining(ledger, { b: '2026-10-12' })
    expect(t.abilities).toEqual({ Awareness: 1 })
    expect(t.attributes).toEqual({ Stamina: 1 })
    expect([...t.specialties]).toEqual(['Awareness'])
  })

  it('calculations use the ratings without them', () => {
    const t = traitTraining(ledger, {})
    expect(trainedAbilities({ Awareness: { rating: 5, specialty: '', excellency: false } }, t).Awareness.rating).toBe(2)
    expect(trainedAttributes({ Stamina: 4, Wits: 2 }, t)).toEqual({ Stamina: 3, Wits: 2 })
  })

  it('never goes below 0 if the rating was lowered by hand meanwhile', () => {
    expect(trainedAttributes({ Stamina: 0 }, traitTraining(ledger, {})).Stamina).toBe(0)
  })

  it('counts everything once done', () => {
    const t = traitTraining(ledger, { a: 'x', b: 'x', c: 'x', d: 'x' })
    expect(t.abilities).toEqual({})
    expect(t.specialties.size).toBe(0)
  })
})
