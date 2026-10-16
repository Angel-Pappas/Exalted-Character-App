import type { AbilityData, MilestoneTransaction, TraitPurchase, TrainingDone } from '../types/character'
import { inTraining } from './milestones'

// Ability dots, attribute dots and specialties bought with milestones. Logging
// the purchase raises the rating (or sets the specialty) on the sheet at once;
// while its training runs, the sheet marks it and every calculation uses the
// rating without those dots.

export interface TraitTraining {
  abilities: Record<string, number>     // dots still in training, per ability
  attributes: Record<string, number>    // dots still in training, per attribute
  specialties: Set<string>              // abilities whose specialty is in training
}

/** The ledger description for a trait purchase, e.g. "Awareness 2→3" or "Specialty: War (Sieges)". */
export function traitDescription(trait: TraitPurchase, current: number): string {
  if (trait.kind === 'specialty') return `Specialty: ${trait.name} (${trait.specialty})`
  return `${trait.name} ${current}→${current + trait.dots}`
}

/** The sheet after the purchase: the rating raised, or the specialty set. */
export function applyTrait(
  sheet: { attributes: Record<string, number>; abilities: Record<string, AbilityData> },
  trait: TraitPurchase,
): { attributes: Record<string, number>; abilities: Record<string, AbilityData> } {
  const ability = sheet.abilities[trait.name] ?? { rating: 0, specialty: '', excellency: false }
  switch (trait.kind) {
    case 'attribute':
      return { ...sheet, attributes: { ...sheet.attributes, [trait.name]: (sheet.attributes[trait.name] ?? 0) + trait.dots } }
    case 'ability':
      return { ...sheet, abilities: { ...sheet.abilities, [trait.name]: { ...ability, rating: ability.rating + trait.dots } } }
    case 'specialty':
      return { ...sheet, abilities: { ...sheet.abilities, [trait.name]: { ...ability, specialty: trait.specialty } } }
  }
}

/** What is still in training on the sheet's dots and specialties. */
export function traitTraining(milestones: MilestoneTransaction[], done: TrainingDone): TraitTraining {
  const result: TraitTraining = { abilities: {}, attributes: {}, specialties: new Set() }
  for (const { trait } of inTraining(milestones, done)) {
    if (!trait) continue
    if (trait.kind === 'specialty') result.specialties.add(trait.name)
    else {
      const bucket = trait.kind === 'ability' ? result.abilities : result.attributes
      bucket[trait.name] = (bucket[trait.name] ?? 0) + trait.dots
    }
  }
  return result
}

/** Ratings as calculations see them: dots in training don't count (never below 0). */
export function trainedAttributes(attributes: Record<string, number>, training: TraitTraining): Record<string, number> {
  return Object.fromEntries(Object.entries(attributes).map(([name, v]) => [name, Math.max(0, v - (training.attributes[name] ?? 0))]))
}

export function trainedAbilities(abilities: Record<string, AbilityData>, training: TraitTraining): Record<string, AbilityData> {
  return Object.fromEntries(Object.entries(abilities).map(([name, a]) => [name, { ...a, rating: Math.max(0, a.rating - (training.abilities[name] ?? 0)) }]))
}
