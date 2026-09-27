import { describe, it, expect } from 'vitest'
import {
  BASE_LEVELS, buildHealthTrack, clampDamage, currentWound, damageAfterClick, legacyDamage,
  oxBodyGrant, oxBodyHasChoice, woundPenalty, type HealthLevel,
} from './health'

// Each test states a rule from the book. If one fails, it names the broken rule.

const levels = (track: HealthLevel[]) => track.map(l => l.level)

describe('Starting track — "two at 0, two at −1, two at −2, and one at Incapacitated"', () => {
  it('has exactly those seven levels, in that order', () => {
    expect(BASE_LEVELS).toEqual([0, 0, -1, -1, -2, -2, 'incap'])
    expect(levels(buildHealthTrack('Solar Exalted', 'Dawn', 0, []))).toEqual(BASE_LEVELS)
  })

  it('marks none of the starting seven as coming from Ox Body', () => {
    expect(buildHealthTrack('Solar Exalted', 'Dawn', 0, []).some(l => l.oxBody)).toBe(false)
  })
})

describe('Ox Body Technique — levels per purchase, by Exalt type', () => {
  it('Solar and Abyssal choose: one 0 level, or two −1 levels', () => {
    expect(oxBodyGrant('Solar Exalted', 'Dawn', 'zero')).toEqual([0])
    expect(oxBodyGrant('Solar Exalted', 'Dawn', 'twoInjured')).toEqual([-1, -1])
    expect(oxBodyGrant('Abyssal Exalted', '', 'zero')).toEqual([0])
    expect(oxBodyHasChoice('Solar Exalted', 'Dawn')).toBe(true)
    expect(oxBodyHasChoice('Abyssal Exalted', '')).toBe(true)
  })

  it('Janest "gains Ox Body as a Solar Mode", so gets the same choice', () => {
    expect(oxBodyHasChoice('Exigents', 'Janest')).toBe(true)
    expect(oxBodyGrant('Exigents', 'Janest', 'zero')).toEqual([0])
  })

  it('Dragon-Blooded, and anyone without a mode, get the default single −1', () => {
    expect(oxBodyGrant('Dragon-Blooded', 'Fire', 'zero')).toEqual([-1])
    expect(oxBodyGrant('Exigents', 'Other', 'zero')).toEqual([-1])
    expect(oxBodyHasChoice('Dragon-Blooded', 'Fire')).toBe(false)
  })

  it('Sidereal, Getimian, Alchemical and Liminal get a single 0', () => {
    for (const t of ['Sidereal Exalted', 'Getimian Exalted', 'Alchemical Exalted', 'Liminal Exalted']) {
      expect(oxBodyGrant(t, '', 'twoInjured')).toEqual([0])
    }
  })

  it('Lunar and Infernal get a −1 and a −2', () => {
    expect(oxBodyGrant('Lunar Exalted', '', 'zero')).toEqual([-1, -2])
    expect(oxBodyGrant('Infernal Exalted', '', 'zero')).toEqual([-1, -2])
  })

  it('a choice made for one type is ignored by types that have none', () => {
    expect(oxBodyGrant('Lunar Exalted', '', 'twoInjured')).toEqual(oxBodyGrant('Lunar Exalted', '', 'zero'))
  })
})

describe('Building the track with Ox Body', () => {
  it('Kaien: three purchases of two −1s makes 13 levels with eight Injured', () => {
    const track = buildHealthTrack('Solar Exalted', 'Dawn', 3, ['twoInjured', 'twoInjured', 'twoInjured'])
    expect(levels(track)).toEqual([0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -2, -2, 'incap'])
  })

  it('slots each new level into its own group, ahead of Incapacitated', () => {
    const track = buildHealthTrack('Solar Exalted', 'Dawn', 2, ['zero', 'twoInjured'])
    expect(levels(track)).toEqual([0, 0, 0, -1, -1, -1, -1, -2, -2, 'incap'])
    expect(track[track.length - 1].level).toBe('incap')
  })

  it('keeps the starting boxes first within a group, then the Ox Body ones', () => {
    const track = buildHealthTrack('Solar Exalted', 'Dawn', 1, ['zero'])
    expect(track.slice(0, 3).map(l => l.oxBody)).toEqual([false, false, true])
  })

  it('an unset purchase defaults to two −1 levels', () => {
    expect(levels(buildHealthTrack('Solar Exalted', 'Dawn', 1, []))).toEqual([0, 0, -1, -1, -1, -1, -2, -2, 'incap'])
  })

  it('ignores stored picks beyond the number of purchases', () => {
    expect(buildHealthTrack('Solar Exalted', 'Dawn', 1, ['zero', 'zero', 'zero'])).toHaveLength(8)
  })
})

describe('Wound penalty — "the rightmost filled health level ... and just that number"', () => {
  const track = buildHealthTrack('Solar Exalted', 'Dawn', 0, [])

  it('is nothing when unhurt', () => {
    expect(currentWound(track, 0)).toBeNull()
    expect(woundPenalty(track, 0)).toBe(0)
  })

  it('uses only the rightmost filled box, not a running total', () => {
    expect(woundPenalty(track, 2)).toBe(0)   // both Bruised
    expect(woundPenalty(track, 3)).toBe(-1)  // first Injured, not 0 + −1 summed with anything
    expect(woundPenalty(track, 4)).toBe(-1)  // two Injured is still −1, not −2
    expect(woundPenalty(track, 6)).toBe(-2)
  })

  it('reports Incapacitated when the last box is filled', () => {
    expect(currentWound(track, 7)).toBe('incap')
  })

  it('clamps damage beyond the track to the last box', () => {
    expect(currentWound(track, 99)).toBe('incap')
    expect(clampDamage(99, track.length)).toBe(7)
    expect(clampDamage(-3, track.length)).toBe(0)
  })
})

describe('Marking damage — "from left to right"', () => {
  it('clicking a box fills everything up to and including it', () => {
    expect(damageAfterClick(0, 4)).toBe(5)
    expect(damageAfterClick(6, 1)).toBe(2) // clicking further left heals back to there
  })

  it('clicking the rightmost filled box heals just that one', () => {
    expect(damageAfterClick(5, 4)).toBe(4)
  })

  it('older sheets carry their checked boxes over as a damage count', () => {
    expect(legacyDamage([{ checked: true }, { checked: true }, { checked: false }])).toBe(2)
    expect(legacyDamage(undefined)).toBe(0)
  })
})
