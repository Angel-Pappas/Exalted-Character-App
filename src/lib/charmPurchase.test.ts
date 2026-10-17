import { describe, it, expect } from 'vitest'
import { addPurchase, asksForChoice, canBuyAgain, cardSummary, undoPurchase } from './charmPurchase'
import type { CharacterCharm, LibraryCharm } from '../types/character'

const lib = (overrides: Partial<LibraryCharm> = {}): LibraryCharm => ({
  id: 'lib', type: 'Universal', abilities: [], name: 'Charm', page: null, description: 'Text.', summary: null,
  mechanicalKey: null, mechanicalDescription: null, prerequisiteAbilities: [], prerequisiteEssence: null,
  prerequisiteCharms: [], modes: [], choiceType: null, choiceOptions: [], targetChoiceType: null, targetOptions: [],
  multiselectCapBasis: null, pickCounts: null,
  commitMotes: 0, commitNeedsRepurchase: false, ongoing: false, purchaseLimit: null, ...overrides,
})
const owned = (overrides: Partial<CharacterCharm> = {}): CharacterCharm => ({
  id: 'c', libraryId: 'lib', name: 'Charm', libraryDescription: 'Text.', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, ...overrides,
})
const repurchase = { label: 'Repurchase', text: '', prerequisiteEssence: null, prerequisiteAbilities: [] }

describe('canBuyAgain', () => {
  it('is never true for a charm not owned yet (that is a first purchase)', () => {
    expect(canBuyAgain(lib({ modes: [repurchase] }), undefined, [], [])).toBe(false)
  })

  it('needs a Repurchase mode when the charm has no purchase choice', () => {
    expect(canBuyAgain(lib(), owned(), [], [])).toBe(false)
    expect(canBuyAgain(lib({ modes: [repurchase] }), owned(), [], [])).toBe(true)
  })

  it('a purchase limit above 1 allows buying again without a Repurchase mode, up to a numeric limit', () => {
    const phase = lib({ purchaseLimit: '2' })
    expect(canBuyAgain(phase, owned({ count: 1 }), [], [])).toBe(true)
    expect(canBuyAgain(phase, owned({ count: 2 }), [], [])).toBe(false)
    expect(canBuyAgain(lib({ purchaseLimit: 'essence' }), owned({ count: 4 }), [], [])).toBe(true) // the "!" catches the excess
    expect(canBuyAgain(lib({ purchaseLimit: '1' }), owned(), [], [])).toBe(false)
  })

  it('allows another choice purchase while unchosen options remain', () => {
    const excellency = lib({ choiceType: 'ability' })
    expect(canBuyAgain(excellency, owned({ picks: ['War'] }), ['War', 'Embassy'], [])).toBe(true)
    expect(canBuyAgain(excellency, owned({ picks: ['War', 'Embassy'] }), ['War', 'Embassy'], [])).toBe(false)
    expect(canBuyAgain(lib({ choiceType: 'custom', choiceOptions: ['A'] }), owned({ picks: ['A'] }), [], [])).toBe(false)
    expect(canBuyAgain(lib({ choiceType: 'attribute' }), owned({ picks: ['Wits'] }), [], ['Wits', 'Stamina'])).toBe(true)
  })

  it('never limits free-text choices', () => {
    expect(canBuyAgain(lib({ choiceType: 'freetext' }), owned({ picks: ['x', 'y'] }), [], [])).toBe(true)
  })

  it('stops at the end of a pick schedule even with options left', () => {
    const tricks = lib({ choiceType: 'custom', choiceOptions: ['A', 'B', 'C', 'D'], pickCounts: [2, 1] })
    expect(canBuyAgain(tricks, owned({ count: 1, picks: ['A', 'B'] }), [], [])).toBe(true)
    expect(canBuyAgain(tricks, owned({ count: 2, picks: ['A', 'B', 'C'] }), [], [])).toBe(false)
  })
})

describe('addPurchase / undoPurchase', () => {
  it('adds a new entry on the first purchase', () => {
    const next = addPurchase([], lib({ choiceType: 'ability' }), 'War', 'new')
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'new', libraryId: 'lib', count: 1, picks: ['War'], customDescription: null })
  })

  it('bumps the count and appends the pick when bought again', () => {
    const next = addPurchase([owned({ picks: ['War'] })], lib({ choiceType: 'ability' }), 'Embassy', 'unused')
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'c', count: 2, picks: ['War', 'Embassy'] })
  })

  it('keeps several picks of one purchase, and multiselect picks apart', () => {
    expect(addPurchase([], lib(), ['A', 'B'], 'n')[0].picks).toEqual(['A', 'B'])
    const grouped = addPurchase([], lib(), { target: 'Spear', selected: ['x'] }, 'n')[0]
    expect(grouped.groupedPicks).toEqual([{ target: 'Spear', selected: ['x'] }])
    expect(grouped.picks).toBeUndefined()
  })

  it('undoes the last purchase, popping its picks; the last one removes the charm', () => {
    const tricks = lib({ pickCounts: [2, 1] })
    const twice = [owned({ count: 2, picks: ['A', 'B', 'C'] })]
    expect(undoPurchase(twice, tricks)[0]).toMatchObject({ count: 1, picks: ['A', 'B'] })
    expect(undoPurchase([owned()], tricks)).toEqual([])
  })

  it('pops one pick per purchase without a schedule', () => {
    const next = undoPurchase([owned({ count: 3, picks: ['A', 'B', 'C'] }), owned({ id: 'other', libraryId: 'x' })], lib())
    expect(next.map(c => [c.id, c.count, c.picks])).toEqual([['c', 2, ['A', 'B']], ['other', undefined, undefined]])
  })
})

describe('cardSummary', () => {
  it("prefers the player's own, then the library's suggestion, else none", () => {
    expect(cardSummary(owned({ customSummary: 'Mine' }), 'Suggested')).toBe('Mine')
    expect(cardSummary(owned(), 'Suggested')).toBe('Suggested')
    expect(cardSummary(owned({ customSummary: '  ' }), '  ')).toBeNull()
    expect(cardSummary(owned(), null)).toBeNull()
  })
})

describe('asksForChoice', () => {
  it('asks on every purchase of a choice charm, and never for one without a choice', () => {
    expect(asksForChoice(lib({ choiceType: 'ability' }), undefined)).toBe(true)
    expect(asksForChoice(lib({ choiceType: 'ability' }), owned({ count: 3 }))).toBe(true)
    expect(asksForChoice(lib(), undefined)).toBe(false)
  })

  it('skips a purchase its pick schedule gives no pick', () => {
    const taste = lib({ choiceType: 'freetext', pickCounts: [1, 0] })   // Technique-from-Taste: the discipline, once
    expect(asksForChoice(taste, undefined)).toBe(true)
    expect(asksForChoice(taste, owned({ count: 1 }))).toBe(false)
    const unfettered = lib({ choiceType: 'freetext', pickCounts: [0, 1] }) // Unfettered Sun Evasion: a gambit on repurchase
    expect(asksForChoice(unfettered, undefined)).toBe(false)
    expect(asksForChoice(unfettered, owned({ count: 1 }))).toBe(true)
  })
})
