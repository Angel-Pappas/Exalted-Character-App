import type { AbilityData, CharacterCharm, LibraryCharm, MilestoneTransaction, SheetData } from '../types/character'
import { undoPurchase } from './charmPurchase'

// Deleting a line from the milestone ledger, and what it bought on the sheet
// (Angel, 2026-10-16): a purchase still in training goes from the sheet with its
// line; once trained, the player is asked whether it goes too.

type SheetPart = Pick<SheetData, 'charms' | 'attributes' | 'abilities'>

/** What a ledger line put on the sheet that is still there, named for the player; null = nothing. */
export function boughtOnSheet(line: MilestoneTransaction, sheet: SheetPart): string | null {
  if (line.charm) {
    const owned = sheet.charms.find(c => c.libraryId === line.charm?.libraryId)
    if (!owned) return null
    return (owned.count ?? 1) > 1 ? `one purchase of ${owned.name}` : owned.name
  }
  const trait = line.trait
  if (!trait) return null
  if (trait.kind === 'specialty') {
    return sheet.abilities[trait.name]?.specialty === trait.specialty ? `the ${trait.name} specialty (${trait.specialty})` : null
  }
  const rating = trait.kind === 'ability' ? sheet.abilities[trait.name]?.rating ?? 0 : sheet.attributes[trait.name] ?? 0
  if (rating === 0) return null
  const dots = Math.min(trait.dots, rating)
  return `${dots} ${trait.name} dot${dots > 1 ? 's' : ''}`
}

/**
 * The sheet fields that change when the purchase on `line` is taken back: one
 * purchase of its charm (the latest one's picks, as Undo does), its dots (never
 * below 0), or its specialty. `lib` gives the charm's pick schedule, when it has one.
 */
export function undoBought(line: MilestoneTransaction, sheet: SheetPart, lib?: Pick<LibraryCharm, 'id' | 'pickCounts'>): Partial<SheetData> {
  if (line.charm) {
    const charms: CharacterCharm[] = undoPurchase(sheet.charms, lib ?? { id: line.charm.libraryId, pickCounts: null })
    return charms === sheet.charms ? {} : { charms }
  }
  const trait = line.trait
  if (!trait) return {}
  if (trait.kind === 'attribute') {
    return { attributes: { ...sheet.attributes, [trait.name]: Math.max(0, (sheet.attributes[trait.name] ?? 0) - trait.dots) } }
  }
  const ability: AbilityData = sheet.abilities[trait.name] ?? { rating: 0, specialty: '', excellency: false }
  const next = trait.kind === 'specialty'
    ? { ...ability, specialty: ability.specialty === trait.specialty ? '' : ability.specialty }
    : { ...ability, rating: Math.max(0, ability.rating - trait.dots) }
  return { abilities: { ...sheet.abilities, [trait.name]: next } }
}
