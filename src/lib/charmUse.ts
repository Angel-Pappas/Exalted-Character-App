import type { AbilityData, CharacterCharm, IntimacyEntry, LibraryCharm, SheetData } from '../types/character'

// Using charms on the sheet (Angel, 2026-10-16). No costs or steps are tracked:
// only commit dots (each one a mote committed in the Essence panel), an in-use
// switch for charms with an ongoing effect (whose sheet effects apply only while
// it is on), and the "!" mark for a charm bought too often or missing a choice.

/** The mechanical key a charm works by: the player's override, else the library's (read live), else the one saved with it. */
export function charmKey(charm: CharacterCharm, lib: LibraryCharm | undefined): string | null {
  return charm.mechanicalKeyOverride ?? lib?.mechanicalKey ?? charm.libraryMechanicalKey
}

export const IRON_KETTLE = 'iron_kettle'
export const ENDURANCE = 'endurance_cuts'
export const WARD_OF_THE_SUN = 'ward_of_sun'
export const RIGHTEOUS_LION = 'righteous_lion'
export const UNCONQUERED_SIGHT = 'unconquered_sight'
export const FISTS_OF_IRON = 'foi'

// ── Commit dots ───────────────────────────────────────────────────────────

export type Pools = Pick<SheetData, 'motes' | 'anima'>

/**
 * Committing (delta 1) or releasing (delta −1) one mote, exactly as the Essence
 * panel's Committed counter does: committing moves a mote from Current to
 * Committed and raises anima by 1; releasing gives it back to Current. Null when
 * it can't happen (no mote left to commit, nothing committed to release).
 */
export function commitMote(pools: Pools, delta: 1 | -1): Pools | null {
  const committed = pools.motes.committed + delta
  const current = pools.motes.current - delta
  if (committed < 0 || current < 0) return null
  const anima = delta > 0 ? Math.min(10, (pools.anima ?? 0) + 1) : pools.anima ?? 0
  return { motes: { ...pools.motes, committed, current }, anima }
}

/** How many commit dots the charm shows. Some only commit through a repurchase. */
export function dotCount(charm: CharacterCharm, lib: LibraryCharm | undefined): number {
  if (!lib || lib.commitMotes <= 0) return 0
  if (lib.commitNeedsRepurchase && (charm.count ?? 1) < 2) return 0
  return lib.commitMotes
}

/** Dots lit, never more than the charm has. */
export function litDots(charm: CharacterCharm, lib: LibraryCharm | undefined): number {
  return Math.min(charm.litDots ?? 0, dotCount(charm, lib))
}

/**
 * Clicking dot `index`: an unlit dot commits a mote and lights the next dot; a lit
 * one releases a mote and un-lights the last. Un-lighting the last dot also clears
 * a ward's name. Null when the mote can't be committed or released.
 */
export function clickDot(charm: CharacterCharm, lib: LibraryCharm | undefined, index: number, pools: Pools): { charm: CharacterCharm; pools: Pools } | null {
  const lit = litDots(charm, lib)
  const lighting = index >= lit
  if (lighting && lit >= dotCount(charm, lib)) return null
  const next = commitMote(pools, lighting ? 1 : -1)
  if (!next) return null
  const nowLit = lit + (lighting ? 1 : -1)
  const updated: CharacterCharm = { ...charm, litDots: nowLit }
  if (nowLit === 0) delete updated.wardName
  return { charm: updated, pools: next }
}

/** Turns the in-use icon on or off. Turning it off also clears a ward's name. */
export function toggleInUse(charm: CharacterCharm): CharacterCharm {
  if (!charm.inUse) return { ...charm, inUse: true }
  const updated: CharacterCharm = { ...charm, inUse: false }
  delete updated.wardName
  return updated
}

// ── Purchase limits and missing choices: the "!" mark ────────────────────

export interface Traits {
  essence: number
  attributes: Record<string, number>
  abilities: Record<string, AbilityData>
}

/**
 * The most times a charm can be bought, from its library limit: a number, or the
 * rating of the trait it names ("essence", "physique", an Attribute or Ability).
 * Null = no limit (or a trait the sheet doesn't have).
 */
export function purchaseLimit(rule: string | null, traits: Traits): { max: number; label: string } | null {
  const r = rule?.trim().toLowerCase()
  if (!r) return null
  if (/^\d+$/.test(r)) return { max: Number(r), label: '' }
  if (r === 'essence') return { max: traits.essence, label: 'Essence' }
  const match = (names: string[]) => names.find(n => n.toLowerCase() === r)
  const attribute = match(Object.keys(traits.attributes))
  if (attribute) return { max: traits.attributes[attribute] ?? 0, label: attribute }
  const ability = match(Object.keys(traits.abilities))
  if (ability) return { max: traits.abilities[ability]?.rating ?? 0, label: ability }
  return null
}

/** How many picks a choice charm should hold after `count` purchases. */
function picksNeeded(lib: LibraryCharm, count: number): number {
  if (!lib.pickCounts) return count
  return lib.pickCounts.slice(0, count).reduce((sum, n) => sum + n, 0)
}

export interface ProblemContext extends Traits {
  intimacies: IntimacyEntry[]
  oxBodyHasChoice: boolean
}

/** Whether an Intimacy can be the one Righteous Lion Spirit protects. */
export function protectable(intimacy: IntimacyEntry): boolean {
  return intimacy.intensity === 'Major' || intimacy.intensity === 'Defining'
}

/** What the player needs to fix on this charm; empty = nothing (no "!"). */
export function charmProblems(charm: CharacterCharm, lib: LibraryCharm | undefined, ctx: ProblemContext): string[] {
  if (!lib) return []
  const problems: string[] = []
  const count = charm.count ?? 1
  const key = charmKey(charm, lib)

  const limit = purchaseLimit(lib.purchaseLimit, ctx)
  if (limit && count > limit.max) {
    problems.push(`Bought ${count}×; the limit is ${limit.max}${limit.label ? ` (${limit.label})` : ''}.`)
  }

  const missingChoice =
    lib.choiceType === 'multiselect' ? (charm.groupedPicks?.length ?? 0) < count
      : lib.choiceType ? (charm.picks?.length ?? 0) < picksNeeded(lib, count)
      : key === 'ox_body' && ctx.oxBodyHasChoice ? (charm.oxBodyPicks?.length ?? 0) < count
      : false
  if (missingChoice) problems.push('A purchase is missing its choice.')

  if (key === RIGHTEOUS_LION) {
    const protectedOne = ctx.intimacies.find(i => i.id === charm.protectedIntimacyId)
    if (!protectedOne || !protectable(protectedOne)) problems.push('Choose the Major or Defining Intimacy it protects.')
  }

  if (key === UNCONQUERED_SIGHT) {
    const repurchases = count - 1
    const named = (charm.repurchaseAllies ?? []).slice(0, repurchases).filter(a => a.trim() !== '').length
    if (named < repurchases) {
      const missing = repurchases - named
      problems.push(`Name the ally for ${missing} repurchase${missing > 1 ? 's' : ''}.`)
    }
  }

  return problems
}

// ── Sheet effects while in use ──────────────────────────────────────────────

export interface SoakBonus {
  name: string
  value: number
}

/**
 * Soak added by charms in use, each on its own line. `charms` are the charms as
 * their effects see them (purchases in training left out), so a charm still in
 * training adds nothing. `woundPenalty` is the health track's (−1, −2…).
 *  - Iron Kettle Body: +1 per lit dot (its commit, from the repurchase).
 *  - Endurance of a Thousand Cuts: + the wound penalty, as a positive number.
 */
export function charmSoakBonuses(charms: CharacterCharm[], libById: Map<string, LibraryCharm>, woundPenalty: number): SoakBonus[] {
  const bonuses: SoakBonus[] = []
  for (const charm of charms) {
    if (!charm.inUse) continue
    const lib = libById.get(charm.libraryId)
    const key = charmKey(charm, lib)
    const value = key === IRON_KETTLE ? litDots(charm, lib)
      : key === ENDURANCE ? Math.abs(woundPenalty)
      : 0
    if (value > 0) bonuses.push({ name: charm.name, value })
  }
  return bonuses
}

/** The Intimacies protected by Righteous Lion Spirit (in effect), for the gold mark in the Intimacies panel. */
export function protectedIntimacies(charms: CharacterCharm[], libById: Map<string, LibraryCharm>): Set<string> {
  return new Set(charms
    .filter(c => charmKey(c, libById.get(c.libraryId)) === RIGHTEOUS_LION && c.protectedIntimacyId)
    .map(c => c.protectedIntimacyId as string))
}
