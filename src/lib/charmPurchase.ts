import type { CharacterCharm, LibraryCharm } from '../types/character'

// What one purchase picked, for charms with a purchase choice: a plain string is
// one pick, a string[] is several picks made at once (a pickCounts-scheduled
// purchase), and a multiselect pick (target + selected benefits) goes to
// groupedPicks instead of the flat picks list. null = the charm has no choice.
export type ChoicePick = string | string[] | { target: string; selected: string[] }

// Whether `owned` (this character's copy of `lib`, if any) may be bought once more.
// Choice charms depend on the options still unchosen, not on a Repurchase mode, so
// Excellency-style charms can be rebought without one; a pick schedule is a hard cap
// on purchases even if options remain (Sharpshooter's Clever Tricks always leaves
// one of its four unpicked). Other charms need a Repurchase mode.
export function canBuyAgain(lib: LibraryCharm, owned: CharacterCharm | undefined, abilityNames: string[], attributeNames: string[]): boolean {
  if (!owned) return false
  const count = owned.count ?? 1
  if (lib.pickCounts && count >= lib.pickCounts.length) return false
  if (!lib.choiceType) return lib.modes.some(m => m.label.toLowerCase() === 'repurchase')
  const picks = owned.picks ?? []
  const pool = lib.choiceType === 'custom' ? lib.choiceOptions
    : lib.choiceType === 'ability' ? abilityNames
    : lib.choiceType === 'attribute' ? attributeNames
    : null // freetext and multiselect: unlimited
  return pool === null || pool.some(o => !picks.includes(o))
}

// Buys `lib` once more: the first purchase adds a new entry (id `newId`); buying an
// owned charm again bumps its count and appends this purchase's pick(s).
export function addPurchase(charms: CharacterCharm[], lib: LibraryCharm, pick: ChoicePick | null, newId: string): CharacterCharm[] {
  const isArray = Array.isArray(pick)
  const grouped = pick !== null && !isArray && typeof pick === 'object' ? pick : null
  const flat = isArray ? pick : (typeof pick === 'string' ? [pick] : null)
  if (charms.some(c => c.libraryId === lib.id)) {
    return charms.map(c => c.libraryId === lib.id ? {
      ...c,
      count: (c.count ?? 1) + 1,
      picks: flat !== null ? [...(c.picks ?? []), ...flat] : c.picks,
      groupedPicks: grouped !== null ? [...(c.groupedPicks ?? []), grouped] : c.groupedPicks,
    } : c)
  }
  return [...charms, {
    id: newId,
    libraryId: lib.id,
    name: lib.name,
    libraryDescription: lib.description,
    libraryModes: lib.modes,
    libraryMechanicalKey: lib.mechanicalKey,
    customDescription: null,
    mechanicalKeyOverride: null,
    mechanicalEnabled: true,
    count: 1,
    picks: flat !== null ? flat : undefined,
    groupedPicks: grouped !== null ? [grouped] : undefined,
  }]
}

// Undoes the most recent purchase of `lib`, popping that purchase's pick(s); the
// entry goes once its last purchase is undone. For a pickCounts-scheduled charm the
// last purchase may have picked several at once (Sharpshooter's first purchase picks
// 2), so that many are popped.
export function undoPurchase(charms: CharacterCharm[], lib: LibraryCharm): CharacterCharm[] {
  const owned = charms.find(c => c.libraryId === lib.id)
  if (!owned) return charms
  const count = owned.count ?? 1
  if (count <= 1) return charms.filter(c => c.id !== owned.id)
  const popped = lib.pickCounts?.[count - 1] ?? 1
  return charms.map(c => c.id === owned.id ? {
    ...c,
    count: count - 1,
    picks: c.picks && c.picks.length > 0 ? c.picks.slice(0, Math.max(0, c.picks.length - popped)) : c.picks,
    groupedPicks: c.groupedPicks && c.groupedPicks.length > 0 ? c.groupedPicks.slice(0, -1) : c.groupedPicks,
  } : c)
}

// The one-liner on a charm's card: the player's own, else the library's suggestion.
// null = neither exists, so the card shows the start of the description instead.
export function cardSummary(charm: CharacterCharm, librarySummary: string | null | undefined): string | null {
  return charm.customSummary?.trim() || librarySummary?.trim() || null
}
