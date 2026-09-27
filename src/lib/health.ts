// The health track, as pure functions. Lifted out of SheetTab so health.test.ts can
// pin it to the book text quoted below.
//
// Book wording, verbatim:
//
//   "Characters start with seven health levels: two at 0, two at −1, two at −2, and
//    one at Incapacitated. Exalted characters gain extra health levels from the Charm
//    Ox Body Technique."
//   "When a character suffers damage, track it by marking off the boxes associated
//    with their health levels from left to right."
//   "The dice penalty is not cumulative, meaning the rightmost filled health level is
//    the dice penalty applied to all rolls, and just that number."
//   "Each health level also has a name: Bruised (0), Injured (−1), and Critical (−2)."
//
// Ox Body Technique (charm library text): "She also gains an additional −1 Health
// level", replaced per Exalt type by its modes — see oxBodyGrant. "You may purchase
// this a number of times equal to the character's physique."
//
// Because damage always fills from the left, it is stored as a single count rather
// than one checkbox per box: no gap-in-the-middle state can exist.
import type { OxBodyPick } from '../types/character'
import { exaltTypeBase } from './charmRules'

export type WoundLevel = 0 | -1 | -2 | 'incap'

export interface HealthLevel {
  level: WoundLevel
  /** Granted by Ox Body Technique rather than part of the starting seven. */
  oxBody: boolean
}

export const BASE_LEVELS: WoundLevel[] = [0, 0, -1, -1, -2, -2, 'incap']

export const LEVEL_NAMES: Record<string, string> = {
  '0': 'Bruised', '-1': 'Injured', '-2': 'Critical', incap: 'Incapacitated',
}

/** Kaien's choice, and the more health of the two, so it's the default for an unset purchase. */
export const DEFAULT_OX_BODY_PICK: OxBodyPick = 'twoInjured'

const ORDER: WoundLevel[] = [0, -1, -2, 'incap']

// Mode text: "The Exalt gains their choice of an additional 0 or two −1 Health levels"
// (Solar, Abyssal), and "Busy Harvest: Janest gains Ox Body as a Solar Mode."
export function oxBodyHasChoice(exaltType: string, caste: string): boolean {
  const base = exaltTypeBase(exaltType)
  return base === 'solar' || base === 'abyssal' || caste.trim().toLowerCase() === 'janest'
}

/** The health levels one purchase of Ox Body adds, per its Exalt-type modes. */
export function oxBodyGrant(exaltType: string, caste: string, pick: OxBodyPick): WoundLevel[] {
  if (oxBodyHasChoice(exaltType, caste)) return pick === 'zero' ? [0] : [-1, -1]
  switch (exaltTypeBase(exaltType)) {
    // "replaces the default additional −1 Health level with a 0 Health level" /
    // "gains an additional 0 Health level"
    case 'sidereal': case 'getimian': case 'alchemical': case 'liminal':
      return [0]
    // "gains an additional −1 and −2 Health level"
    case 'lunar': case 'infernal':
      return [-1, -2]
    // Dragon-Blooded's mode, and the charm's own default for everyone else.
    default:
      return [-1]
  }
}

/**
 * The full track, left to right: the starting seven plus every Ox Body level,
 * grouped Bruised → Injured → Critical → Incapacitated. Within a group the starting
 * boxes come first, then the Ox Body ones.
 */
export function buildHealthTrack(
  exaltType: string, caste: string, oxBodyPurchases: number, picks: OxBodyPick[],
): HealthLevel[] {
  const levels: HealthLevel[] = BASE_LEVELS.map(level => ({ level, oxBody: false }))
  for (let p = 0; p < oxBodyPurchases; p++) {
    for (const level of oxBodyGrant(exaltType, caste, picks[p] ?? DEFAULT_OX_BODY_PICK)) {
      levels.push({ level, oxBody: true })
    }
  }
  // Array sort is stable, so starting boxes stay ahead of Ox Body ones in each group.
  return levels.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))
}

/** Damage can never be negative or exceed the boxes available. */
export function clampDamage(damage: number, trackLength: number): number {
  return Math.max(0, Math.min(trackLength, Math.floor(damage) || 0))
}

/** The rightmost filled level, or null when unhurt. */
export function currentWound(track: HealthLevel[], damage: number): WoundLevel | null {
  const filled = clampDamage(damage, track.length)
  return filled === 0 ? null : track[filled - 1].level
}

/** Dice penalty to rolls: the rightmost filled box's number. Incapacitated has none to add. */
export function woundPenalty(track: HealthLevel[], damage: number): number {
  const w = currentWound(track, damage)
  return w === null || w === 'incap' ? 0 : w
}

/**
 * Clicking a box fills the track up to and including it. Clicking the rightmost
 * filled box instead heals that one level, so a misclick is one click to undo.
 */
export function damageAfterClick(damage: number, index: number): number {
  return damage === index + 1 ? index : index + 1
}

/** Sheets saved before damage was a count stored a checkbox per box. */
export function legacyDamage(boxes: { checked: boolean }[] | undefined): number {
  return (boxes ?? []).filter(b => b.checked).length
}
