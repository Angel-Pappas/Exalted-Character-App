import { describe, expect, it } from 'vitest'
import type { CharacterCharm, IntimacyEntry, LibraryCharm } from '../types/character'
import {
  charmKey, charmProblems, charmSoakBonuses, clickDot, commitMote, dotCount, protectedIntimacies, purchaseLimit, toggleInUse,
  type ProblemContext,
} from './charmUse'

// Angel, 2026-10-16: commit dots on the card work like committing a mote by hand;
// an in-use icon switches ongoing effects on and off; a "!" marks a charm bought
// too often or missing a choice.

const lib = (overrides: Partial<LibraryCharm> = {}): LibraryCharm => ({
  id: 'lib', type: 'Universal', abilities: [], name: 'Charm', page: null, description: '', summary: null,
  mechanicalKey: null, mechanicalDescription: null, prerequisiteAbilities: [], prerequisiteEssence: null,
  prerequisiteCharms: [], modes: [], choiceType: null, choiceOptions: [], targetChoiceType: null, targetOptions: [],
  multiselectCapBasis: null, pickCounts: null, commitMotes: 0, commitNeedsRepurchase: false, ongoing: false, purchaseLimit: null,
  ...overrides,
})
const charm = (overrides: Partial<CharacterCharm> = {}): CharacterCharm => ({
  id: 'c', libraryId: 'lib', name: 'Charm', libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, ...overrides,
})
const pools = (current: number, committed = 0, anima = 0) => ({ motes: { current, committed, total: 10 }, anima })
const ctx = (overrides: Partial<ProblemContext> = {}): ProblemContext => ({
  essence: 3, attributes: { Stamina: 5 }, abilities: { Physique: { rating: 5, specialty: '', excellency: false } },
  intimacies: [], oxBodyHasChoice: false, ...overrides,
})

describe('committing a mote, as the Essence panel does by hand', () => {
  it('moves a mote from Current to Committed and raises anima by 1', () => {
    expect(commitMote(pools(10, 0, 3), 1)).toEqual(pools(9, 1, 4))
  })

  it('releasing gives the mote back and leaves anima alone', () => {
    expect(commitMote(pools(9, 1, 4), -1)).toEqual(pools(10, 0, 4))
  })

  it('anima stops at 10', () => {
    expect(commitMote(pools(5, 0, 10), 1)?.anima).toBe(10)
  })

  it("can't commit with no mote left, or release what isn't committed", () => {
    expect(commitMote(pools(0, 3), 1)).toBeNull()
    expect(commitMote(pools(10, 0), -1)).toBeNull()
  })
})

describe('commit dots', () => {
  const league = lib({ commitMotes: 2 })

  it('shows one dot per mote the charm commits', () => {
    expect(dotCount(charm(), league)).toBe(2)
    expect(dotCount(charm(), lib())).toBe(0)
  })

  it('Iron Kettle Body commits only through its repurchase', () => {
    const kettle = lib({ commitMotes: 2, commitNeedsRepurchase: true })
    expect(dotCount(charm({ count: 1 }), kettle)).toBe(0)
    expect(dotCount(charm({ count: 2 }), kettle)).toBe(2)
  })

  it('an empty dot lights and commits a mote', () => {
    const result = clickDot(charm(), league, 0, pools(10))
    expect(result?.charm.litDots).toBe(1)
    expect(result?.pools).toEqual(pools(9, 1, 1))
  })

  it('a lit dot un-lights and releases its mote', () => {
    const result = clickDot(charm({ litDots: 2 }), league, 1, pools(8, 2, 2))
    expect(result?.charm.litDots).toBe(1)
    expect(result?.pools).toEqual(pools(9, 1, 2))
  })

  it("won't light without a mote to commit", () => {
    expect(clickDot(charm(), league, 0, pools(0))).toBeNull()
  })

  it("won't light past the charm's dots", () => {
    expect(clickDot(charm({ litDots: 2 }), league, 2, pools(8, 2))).toBeNull()
  })

  it("un-lighting the last dot clears Ward of the Sun's ward", () => {
    const ward = lib({ commitMotes: 1 })
    const result = clickDot(charm({ litDots: 1, wardName: 'Veyra' }), ward, 0, pools(9, 1))
    expect(result?.charm.wardName).toBeUndefined()
  })
})

describe('the in-use icon', () => {
  it('turns on and off', () => {
    expect(toggleInUse(charm()).inUse).toBe(true)
    expect(toggleInUse(charm({ inUse: true })).inUse).toBe(false)
  })

  it("turning it off clears Ward of the Sun's ward, and never touches the dots", () => {
    const off = toggleInUse(charm({ inUse: true, litDots: 1, wardName: 'Veyra' }))
    expect(off.wardName).toBeUndefined()
    expect(off.litDots).toBe(1)
  })
})

describe('purchase limits — every purchase counts, the first included', () => {
  it('reads a number or a trait rating', () => {
    expect(purchaseLimit('3', ctx())?.max).toBe(3)
    expect(purchaseLimit('essence', ctx())).toEqual({ max: 3, label: 'Essence' })
    expect(purchaseLimit('physique', ctx())).toEqual({ max: 5, label: 'Physique' })
    expect(purchaseLimit('stamina', ctx())).toEqual({ max: 5, label: 'Stamina' })
  })

  it('no limit when none is set or the trait is unknown', () => {
    expect(purchaseLimit(null, ctx())).toBeNull()
    expect(purchaseLimit('luck', ctx())).toBeNull()
  })

  it("Unconquered Sun's Sight bought 5× over Essence 3 gets the \"!\"", () => {
    const sight = lib({ purchaseLimit: 'essence' })
    expect(charmProblems(charm({ count: 5, repurchaseAllies: ['a', 'b', 'c', 'd'] }), sight, ctx()))
      .toEqual(['Bought 5×; the limit is 3 (Essence).'])
    expect(charmProblems(charm({ count: 3, repurchaseAllies: ['a', 'b'] }), sight, ctx())).toEqual([])
  })

  it('Ox Body ×3 within Physique 5 is fine', () => {
    expect(charmProblems(charm({ count: 3 }), lib({ purchaseLimit: 'physique' }), ctx())).toEqual([])
  })
})

describe('missing choices', () => {
  it('a choice charm with fewer picks than purchases', () => {
    const excellency = lib({ choiceType: 'ability' })
    expect(charmProblems(charm({ count: 2, picks: ['War'] }), excellency, ctx())).toEqual(['A purchase is missing its choice.'])
    expect(charmProblems(charm({ count: 2, picks: ['War', 'Embassy'] }), excellency, ctx())).toEqual([])
  })

  it('follows a pick schedule (2 on the first purchase, 1 on the next)', () => {
    const tricks = lib({ choiceType: 'custom', pickCounts: [2, 1] })
    expect(charmProblems(charm({ count: 2, picks: ['a', 'b'] }), tricks, ctx())).toHaveLength(1)
    expect(charmProblems(charm({ count: 2, picks: ['a', 'b', 'c'] }), tricks, ctx())).toEqual([])
  })

  it("Ox Body's health-level choice, where the Exalt type has one", () => {
    const ox = lib({ mechanicalKey: 'ox_body' })
    expect(charmProblems(charm({ count: 2, oxBodyPicks: ['zero'] }), ox, ctx({ oxBodyHasChoice: true }))).toHaveLength(1)
    expect(charmProblems(charm({ count: 2 }), ox, ctx({ oxBodyHasChoice: false }))).toEqual([])
  })

  it('Righteous Lion Spirit needs a Major or Defining Intimacy chosen', () => {
    const lion = lib({ mechanicalKey: 'righteous_lion' })
    const intimacies: IntimacyEntry[] = [
      { id: 'minor', intensity: 'Minor', description: 'Maelia' },
      { id: 'major', intensity: 'Major', description: 'Blaque' },
    ]
    const problem = ['Choose the Major or Defining Intimacy it protects.']
    expect(charmProblems(charm(), lion, ctx({ intimacies }))).toEqual(problem)
    expect(charmProblems(charm({ protectedIntimacyId: 'minor' }), lion, ctx({ intimacies }))).toEqual(problem)
    expect(charmProblems(charm({ protectedIntimacyId: 'gone' }), lion, ctx({ intimacies }))).toEqual(problem)
    expect(charmProblems(charm({ protectedIntimacyId: 'major' }), lion, ctx({ intimacies }))).toEqual([])
  })

  it("Unconquered Sun's Sight needs an ally named for each repurchase", () => {
    const sight = lib({ mechanicalKey: 'unconquered_sight' })
    expect(charmProblems(charm({ count: 3 }), sight, ctx())).toEqual(['Name the ally for 2 repurchases.'])
    expect(charmProblems(charm({ count: 3, repurchaseAllies: ['Veyra', ' '] }), sight, ctx())).toEqual(['Name the ally for 1 repurchase.'])
    expect(charmProblems(charm({ count: 3, repurchaseAllies: ['Veyra', 'Blaque'] }), sight, ctx())).toEqual([])
  })

  it('reads the key from the library, so charms bought before it had one are covered', () => {
    expect(charmKey(charm({ libraryMechanicalKey: null }), lib({ mechanicalKey: 'righteous_lion' }))).toBe('righteous_lion')
    expect(charmKey(charm({ mechanicalKeyOverride: 'foi' }), lib({ mechanicalKey: 'righteous_lion' }))).toBe('foi')
  })
})

describe('Soak from charms in use', () => {
  const kettle = lib({ id: 'kettle', mechanicalKey: 'iron_kettle', commitMotes: 2, commitNeedsRepurchase: true })
  const endurance = lib({ id: 'endurance', mechanicalKey: 'endurance_cuts' })
  const libs = new Map([[kettle.id, kettle], [endurance.id, endurance]])
  const kettleCharm = (o: Partial<CharacterCharm>) => charm({ libraryId: 'kettle', name: 'Iron Kettle Body', count: 2, ...o })
  const enduranceCharm = (o: Partial<CharacterCharm>) => charm({ libraryId: 'endurance', name: 'Endurance of a Thousand Cuts', ...o })

  it('Iron Kettle Body: +1 per lit dot, only while in use', () => {
    expect(charmSoakBonuses([kettleCharm({ inUse: true, litDots: 2 })], libs, 0)).toEqual([{ name: 'Iron Kettle Body', value: 2 }])
    expect(charmSoakBonuses([kettleCharm({ inUse: true, litDots: 1 })], libs, 0)).toEqual([{ name: 'Iron Kettle Body', value: 1 }])
    expect(charmSoakBonuses([kettleCharm({ inUse: false, litDots: 2 })], libs, 0)).toEqual([])
    expect(charmSoakBonuses([kettleCharm({ inUse: true, litDots: 0 })], libs, 0)).toEqual([])
  })

  it('Endurance of a Thousand Cuts: the wound penalty, as a bonus, while in use', () => {
    expect(charmSoakBonuses([enduranceCharm({ inUse: true })], libs, -2)).toEqual([{ name: 'Endurance of a Thousand Cuts', value: 2 }])
    expect(charmSoakBonuses([enduranceCharm({ inUse: true })], libs, 0)).toEqual([])
    expect(charmSoakBonuses([enduranceCharm({ inUse: false })], libs, -4)).toEqual([])
  })

  it('a charm left out because it is in training adds nothing (the caller passes charms in effect)', () => {
    expect(charmSoakBonuses([], libs, -4)).toEqual([])
  })
})

describe("Righteous Lion Spirit's mark in the Intimacies panel", () => {
  it('marks the protected Intimacy', () => {
    const lion = lib({ id: 'lion', mechanicalKey: 'righteous_lion' })
    const marked = protectedIntimacies([charm({ libraryId: 'lion', protectedIntimacyId: 'blaque' })], new Map([['lion', lion]]))
    expect([...marked]).toEqual(['blaque'])
  })
})
