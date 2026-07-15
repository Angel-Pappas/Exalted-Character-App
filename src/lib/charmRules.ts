// Pure charm rules: scoping (what a character can see), sorting (what order it
// reads in), and gating (what is locked and why). No React, no Supabase, no DOM —
// everything here is a plain function of its arguments, which is what lets
// charmRules.test.ts pin the game rules down without rendering anything.
//
// These were previously split between SheetTab.tsx and CharmLibraryTab.tsx, with
// the sheet importing helpers out of a component module. Both now import here.
import type { AbilityData, CharmMode } from '../types/character'
import { CHARM_TYPE_OPTIONS } from '../types/character'

// ── Naming ─────────────────────────────────────────────────────────────────

// Character sheets store the exalt_types.name value ("Solar Exalted"), while
// charm_library.type and mode labels use the bare name ("Solar"). Normalize so
// comparisons line up.
export function exaltTypeBase(exaltType: string): string {
  return exaltType.replace(/\s*Exalted\s*$/i, '').trim().toLowerCase()
}

// Strips a parenthetical qualifier: "Athletics (Style)" → "Athletics".
export function baseAbility(ability: string): string {
  return ability.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

// ── Scoping ────────────────────────────────────────────────────────────────

// Universal/Martial Arts are always in scope; a character's own Exalt type is too.
// Everything else (other Exalt types) stays hidden until Show All is on.
export function isTypeInScope(t: string, exaltType: string, showAll: boolean): boolean {
  if (showAll) return true
  const lower = (t || 'Universal').toLowerCase()
  if (lower === 'universal' || lower === 'martial arts') return true
  return !!exaltType && lower === exaltTypeBase(exaltType)
}

// Caste/Aspect names seen across the charm library that aren't also a full Exalt
// type name (Dragon-Blooded's five elements, Liminal's five aspects, Janest).
// Used only to positively identify "this is someone else's caste variant" so it
// can be hidden — anything NOT in here falls through to the safe default below.
const KNOWN_CASTE_LABELS = ['earth', 'fire', 'water', 'wood', 'air', 'blood', 'breath', 'flesh', 'marrow', 'soil', 'janest']

// Upgrade/Repurchase modes apply regardless of Exalt type. A single mode label can
// also name several Exalt types at once (e.g. "Alchemical, Getimian, Lunar, and
// Liminal" on [Ability] Excellency) when they all share identical rules text —
// split on commas/"and" and check membership rather than exact-matching the whole
// string. Anything that isn't recognized as a type or caste/aspect name defaults
// to visible: several charms (Seasoned Criminal Method, Soul Fire Shaper Form,
// Sharpshooter's Clever Tricks) use one-off named modes with no type restriction
// at all, and a strict allowlist would wrongly hide those.
export function isModeInScope(label: string, exaltType: string, caste: string, showAll: boolean): boolean {
  if (showAll) return true
  const lower = label.toLowerCase()
  if (lower === 'upgrade' || lower === 'repurchase') return true
  const tokens = lower.split(/,| and /).map(t => t.trim()).filter(Boolean)
  const allAreTypes = tokens.length > 0 && tokens.every(t => CHARM_TYPE_OPTIONS.some(ct => ct.toLowerCase() === t))
  if (allAreTypes) return !!exaltType && tokens.includes(exaltTypeBase(exaltType))
  if (caste && lower === caste.toLowerCase()) return true
  if (KNOWN_CASTE_LABELS.includes(lower)) return false
  return true
}

// ── Gating ─────────────────────────────────────────────────────────────────

// Parses admin-authored prerequisite strings like "Integrity 2" or "Ranged Combat 4"
// (ability name + trailing minimum rating). Returns null if the format doesn't
// match, which callers treat as "can't evaluate, don't lock over it."
export function parsePrereqAbility(text: string): { name: string; min: number } | null {
  const m = text.trim().match(/^(.*?)\s+(\d+)$/)
  return m ? { name: m[1].trim(), min: parseInt(m[2], 10) } : null
}

// What (if anything) is stopping this specific mode from being "live" for the
// character right now. Empty array = unlocked.
export function modeLockReasons(
  mode: CharmMode,
  allModes: CharmMode[],
  charmCount: number,
  essence: number,
  abilities: Record<string, AbilityData>,
): string[] {
  const reasons: string[] = []
  if (mode.prerequisiteEssence != null && essence < mode.prerequisiteEssence) {
    reasons.push(`Essence ${mode.prerequisiteEssence}`)
  }
  for (const req of mode.prerequisiteAbilities) {
    const parsed = parsePrereqAbility(req)
    if (!parsed) continue
    const key = baseAbility(parsed.name)
    if (!(key in abilities)) continue // e.g. Alchemical Force/Finesse/Fortitude — not tracked, don't lock over it
    if ((abilities[key]?.rating ?? 0) < parsed.min) reasons.push(`${parsed.name} ${parsed.min}`)
  }
  if (mode.label.toLowerCase() === 'repurchase') {
    // Multiple same-charm "Repurchase" rows (e.g. Sorcerous Initiation's Essence 3
    // then Essence 5 tiers) aren't ordered in the DB — rank by ascending Essence
    // requirement to assign a tier, so each successive tier needs one more purchase.
    const repurchaseModes = allModes.filter(m => m.label.toLowerCase() === 'repurchase')
      .sort((a, b) => (a.prerequisiteEssence ?? 0) - (b.prerequisiteEssence ?? 0))
    const tier = repurchaseModes.indexOf(mode)
    if (charmCount < 2 + Math.max(tier, 0)) reasons.push('Repurchase')
  }
  return reasons
}

// ── Sorting / presentation ─────────────────────────────────────────────────

// A distinct glyph per mode label, so a row with several different Exalt-type
// variants (e.g. Solar, Lunar, Dragon-Blooded) reads as different icons at a
// glance, not a row of identical marks. Falls back to a generic diamond for
// anything unrecognized (one-off labels like a specific charm name).
const MODE_ICONS: Record<string, string> = {
  upgrade: '↑',
  repurchase: '↻',
  solar: '☀',
  lunar: '☾',
  sidereal: '✦',
  abyssal: '☠',
  infernal: '♨',
  liminal: '⚰',
  alchemical: '⚛',
  getimian: '⏣',
  'dragon-blooded': '☉',
  janest: '✿',
  earth: '⛰',
  fire: '🔥',
  water: '💧',
  wood: '🌳',
  air: '🌬',
}

export function modeIcon(label: string): { glyph: string; title: string } {
  const glyph = MODE_ICONS[label.toLowerCase()] ?? '◆'
  return { glyph, title: label }
}

export function typeRank(t: string): number {
  const lower = t.toLowerCase()
  if (lower === 'universal') return 0
  if (lower === 'solar') return 1
  if (lower === 'martial arts') return 2
  return 3
}

// Excellency is the universal "buy for any ability" charm, so it always leads
// ability lists; Style (Martial Arts) abilities trail; everything else is in
// the alphabetical middle.
export function abilityRank(ability: string): number {
  if (baseAbility(ability).toLowerCase() === 'excellency') return 0
  if (ability.includes('Style')) return 2
  return 1
}

export function sortAbilities(abilities: string[]): string[] {
  return [...abilities].sort((a, b) => {
    const rankDiff = abilityRank(a) - abilityRank(b)
    if (rankDiff !== 0) return rankDiff
    return a.localeCompare(b)
  })
}

function modeRank(label: string): number {
  const lower = label.toLowerCase()
  if (lower === 'upgrade') return 0
  if (lower === 'repurchase') return 1
  if (lower === 'solar') return 2
  return 3
}

export function sortModes(modes: CharmMode[]): CharmMode[] {
  return [...modes].sort((a, b) => {
    const rankDiff = modeRank(a.label) - modeRank(b.label)
    if (rankDiff !== 0) return rankDiff
    return modeRank(a.label) === 3 ? a.label.localeCompare(b.label) : 0
  })
}
