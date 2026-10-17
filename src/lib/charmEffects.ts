import type { AbilityData, CharacterCharm, LibraryCharm } from '../types/character'
import { exaltTypeBase } from './charmRules'
import { charmKey, hasInUseIcon, litDots, type ModeContext } from './charmUse'

// What charms change on the sheet itself (Angel's rules, 2026-10-16): a charm with
// an in-use icon changes the sheet only while the icon is on; a charm without one
// (Defense of Shining Joy) always does. `charms` are the charms as their effects
// see them, purchases still in training left out, so a charm in training does
// nothing. Only numbers the sheet shows are touched (Defenses, health track, wound
// penalty); everything else a charm does is the table's business.
//
// Each source gets its own line in the Defenses breakdown, and counts like Ox
// Body's +1: part of the base, not gear, so the +5 cap doesn't trim it.

export const IRON_KETTLE = 'iron_kettle'
export const ENDURANCE = 'endurance_cuts'

export type DefenseStat = 'parry' | 'evasion' | 'soak' | 'hardness' | 'resolve'

export interface StatLine {
  name: string
  stat: DefenseStat
  value: number
}

export interface EffectContext extends ModeContext {
  /** The wound penalty after charms that reduce it (−1, −2…; 0 when unhurt). */
  woundPenalty: number
  defendOther: boolean
  armorEquipped: boolean
}

type Bonuses = Partial<Record<DefenseStat, number>>
const DEFENSE = (n: number): Bonuses => ({ parry: n, evasion: n })

const isType = (ctx: ModeContext, type: string) => exaltTypeBase(ctx.exaltType) === type
const isJanest = (ctx: ModeContext) => ctx.caste.trim().toLowerCase() === 'janest'

/**
 * The flat bonuses, by mechanical key. Quoted from the charm text:
 *  - Iron Kettle Body (repurchase): "commit the motes … Soak increase" — +1 per lit dot.
 *  - Endurance of a Thousand Cuts: "Add the Solar's current wound penalty to her Soak".
 *  - Mantis Form: "Increase the Exalt's Defense and Soak by 1 each."
 *  - Wood Dragon Form: "increase their Defense and Soak by 1" (+2 against marked foes: not shown).
 *  - Crane Form: "Defense increases by 1" (+2 against some foes: not shown).
 *  - Root-and-Hand Merging: "her Defense increases by 1 while she uses it".
 *  - Skin-Flaying Wind Dance: "increase Defense by one" (while she keeps moving, as it requires).
 *  - Earth Dragon Form: "Soak increases by 3"; Dragon-Blooded: "increases Hardness by 1".
 *  - Undying Body: "gains 2 Soak and 2 Hardness".
 *  - Viridian Rust Defense: "Commit 1 mote while wearing armor … gains 2 additional Soak".
 *  - Void Avatar Embodiment: "adds three to her Hardness".
 *  - Soul Fire Shaper Form: "treats her Essence as though it were 2 higher" — Hardness is 2 + Essence.
 *  - Loyal Guardian Approach, while Defend Other is on: Alchemical "increases their Defense and
 *    Soak by 1 when shielding another"; Janest "gains 1 Defense when protecting another".
 */
const BONUSES: Record<string, (ctx: EffectContext, charm: CharacterCharm, lib: LibraryCharm | undefined) => Bonuses> = {
  [IRON_KETTLE]: (ctx, charm, lib) => ({ soak: litDots(charm, lib, ctx) }),
  [ENDURANCE]: ctx => ({ soak: Math.abs(ctx.woundPenalty) }),
  mantis_form: () => ({ ...DEFENSE(1), soak: 1 }),
  wood_dragon_form: () => ({ ...DEFENSE(1), soak: 1 }),
  crane_form: () => DEFENSE(1),
  root_and_hand: () => DEFENSE(1),
  skin_flaying: () => DEFENSE(1),
  earth_dragon_form: ctx => ({ soak: 3, ...(isType(ctx, 'dragon-blooded') ? { hardness: 1 } : {}) }),
  undying_body: () => ({ soak: 2, hardness: 2 }),
  viridian_rust: ctx => (ctx.armorEquipped ? { soak: 2 } : {}),
  void_avatar: () => ({ hardness: 3 }),
  soul_fire_shaper: () => ({ hardness: 2 }),
  loyal_guardian: ctx => !ctx.defendOther ? {}
    : isType(ctx, 'alchemical') ? { ...DEFENSE(1), soak: 1 }
    : isJanest(ctx) ? DEFENSE(1)
    : {},
}

/** Charms with an effect key whose effect is on: in use, or always on for a charm without an in-use icon. */
export function charmsWithEffect(charms: CharacterCharm[], libById: Map<string, LibraryCharm>, ctx: ModeContext): { charm: CharacterCharm; lib: LibraryCharm | undefined; key: string }[] {
  return charms.flatMap(charm => {
    const lib = libById.get(charm.libraryId)
    const key = charmKey(charm, lib)
    if (!key) return []
    const on = hasInUseIcon(charm, lib, ctx) ? !!charm.inUse : true
    return on ? [{ charm, lib, key }] : []
  })
}

/** Each charm's bonus to each Defense, one line per charm and stat, zeros left out. */
export function charmStatLines(charms: CharacterCharm[], libById: Map<string, LibraryCharm>, ctx: EffectContext): StatLine[] {
  const lines: StatLine[] = []
  for (const { charm, lib, key } of charmsWithEffect(charms, libById, ctx)) {
    const bonuses = BONUSES[key]?.(ctx, charm, lib) ?? {}
    for (const [stat, value] of Object.entries(bonuses) as [DefenseStat, number][]) {
      if (value !== 0) lines.push({ name: charm.name, stat, value })
    }
  }
  return lines
}

/** The lines for one Defense, and their total. */
export function statTotal(lines: StatLine[], stat: DefenseStat): number {
  return lines.filter(l => l.stat === stat).reduce((sum, l) => sum + l.value, 0)
}

// ── Defense from another Ability ────────────────────────────────────────────

export interface DefenseAbility {
  ability: string
  rating: number
  /** The charm that lets this Ability stand in; null = the book's own. */
  by: string | null
}

/**
 * Which Ability Parry (default Close Combat) and Evasion (default Athletics) are
 * worked out with. Quoted:
 *  - Streaming Arrow Stance: "calculates her Defense using Ranged Combat instead of
 *    Close Combat or Athletics".
 *  - Games of Divinity Form: "calculates Defense with Embassy or Sagacity instead of
 *    Athletics or Close Combat" — the higher of the two.
 *  - Ebon Shadow Form: "may calculate Evasion using Stealth instead of Athletics".
 *  - Defense of Shining Joy: "may use Performance instead of Athletics to calculate
 *    her Evasion" — always on, used only when higher.
 * The first three replace the default while in use; if several do, the highest
 * rating wins. A "may" swap competes with the default too.
 */
export function defenseAbilities(charms: CharacterCharm[], libById: Map<string, LibraryCharm>, ctx: ModeContext, abilities: Record<string, AbilityData>): { parry: DefenseAbility; evasion: DefenseAbility } {
  const rating = (name: string) => abilities[name]?.rating ?? 0
  const option = (ability: string, by: string | null): DefenseAbility => ({ ability, rating: rating(ability), by })
  const replacing: Record<'parry' | 'evasion', DefenseAbility[]> = { parry: [], evasion: [] }
  const optional: Record<'parry' | 'evasion', DefenseAbility[]> = { parry: [], evasion: [] }
  for (const { charm, key } of charmsWithEffect(charms, libById, ctx)) {
    if (key === 'streaming_arrow') {
      replacing.parry.push(option('Ranged Combat', charm.name))
      replacing.evasion.push(option('Ranged Combat', charm.name))
    } else if (key === 'games_of_divinity') {
      const best = rating('Sagacity') > rating('Embassy') ? 'Sagacity' : 'Embassy'
      replacing.parry.push(option(best, charm.name))
      replacing.evasion.push(option(best, charm.name))
    } else if (key === 'ebon_shadow_form') {
      replacing.evasion.push(option('Stealth', charm.name))
    } else if (key === 'shining_joy') {
      optional.evasion.push(option('Performance', charm.name))
    }
  }
  const pick = (stat: 'parry' | 'evasion', book: string): DefenseAbility => {
    const candidates = [...(replacing[stat].length ? replacing[stat] : [option(book, null)]), ...optional[stat]]
    return candidates.reduce((best, c) => (c.rating > best.rating ? c : best))
  }
  return { parry: pick('parry', 'Close Combat'), evasion: pick('evasion', 'Athletics') }
}

// ── Health track and wound penalty ──────────────────────────────────────────

export interface ExtraLevels {
  name: string
  count: number
}

/**
 * Bruised (0) health levels charms add while in use. Quoted:
 *  - Heartless Maiden Trance: "gains one temporary Bruised Health level".
 *  - Undying Body: "At Essence 3 and again at Essence 5, gain an additional Bruised
 *    Health level when activating this Charm."
 */
export function charmHealthLevels(charms: CharacterCharm[], libById: Map<string, LibraryCharm>, ctx: ModeContext): ExtraLevels[] {
  return charmsWithEffect(charms, libById, ctx).flatMap(({ charm, key }) => {
    const count = key === 'heartless_maiden' ? 1
      : key === 'undying_body' ? (ctx.essence >= 5 ? 2 : ctx.essence >= 3 ? 1 : 0)
      : 0
    return count > 0 ? [{ name: charm.name, count }] : []
  })
}

export interface WoundPenaltyChange {
  /** The penalty after charms: never below the track's, never above 0. */
  penalty: number
  /** The charms that changed it, for the Health panel's hint. */
  lines: { name: string; text: string }[]
}

/**
 * The wound penalty after charms. Quoted:
 *  - Undying Body: "reduces all wound penalties by one".
 *  - Relentless Lunar Fury: "reduces all wound penalties … by one to a minimum of zero".
 *  - Earth Dragon Form, Dragon-Blooded: "ignores wound penalties".
 */
export function woundPenaltyAfterCharms(raw: number, charms: CharacterCharm[], libById: Map<string, LibraryCharm>, ctx: ModeContext): WoundPenaltyChange {
  const lines: { name: string; text: string }[] = []
  let reduction = 0
  let ignored = false
  for (const { charm, key } of charmsWithEffect(charms, libById, ctx)) {
    if (key === 'undying_body' || key === 'relentless_fury') {
      reduction += 1
      lines.push({ name: charm.name, text: '−1 to the wound penalty' })
    } else if (key === 'earth_dragon_form' && isType(ctx, 'dragon-blooded')) {
      ignored = true
      lines.push({ name: charm.name, text: 'ignores the wound penalty' })
    }
  }
  const penalty = ignored ? 0 : Math.min(0, raw + reduction)
  return { penalty, lines: raw < 0 ? lines : [] }
}
