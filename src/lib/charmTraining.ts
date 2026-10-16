import type { CharacterCharm, LibraryCharm, MilestoneTransaction, TrainingDone } from '../types/character'
import { addPurchase, undoPurchase, type ChoicePick } from './charmPurchase'
import { inTraining, type MilestoneAmounts } from './milestones'

// Charms and the milestone ledger, kept in step: buying a charm logs the line
// that paid for it, and a purchase whose line is still in training shows on the
// sheet but has no effect yet. Charms live in the sheet and the ledger beside it,
// so every change here returns both.

/** How a charm purchase was paid for: milestones (usually starting a training), or the starting build. */
export type CharmCost =
  | { kind: 'purchase'; amounts: MilestoneAmounts; training: boolean }
  | { kind: 'creation' }

export interface CharmsAndLedger {
  charms: CharacterCharm[]
  milestones: MilestoneTransaction[]
}

/** The ledger line for one purchase of `lib`, as the Milestones tab would log it. */
export function charmLine(lib: Pick<LibraryCharm, 'id' | 'name'>, repurchase: boolean, cost: CharmCost, id: string, date: string): MilestoneTransaction {
  const none = { personal: 0, exalted: 0, minor: 0, major: 0 }
  return {
    id,
    kind: cost.kind,
    ...(cost.kind === 'purchase' ? cost.amounts : none),
    description: `Charm (${lib.name})${repurchase ? ' repurchase' : ''}`,
    date: cost.kind === 'creation' ? '' : date,
    ...(cost.kind === 'purchase' && cost.training ? { training: true } : {}),
    charm: { libraryId: lib.id, name: lib.name },
  }
}

/** Buys `lib` once more and logs the line that paid for it. */
export function buyCharm(
  current: CharmsAndLedger, lib: LibraryCharm, pick: ChoicePick | null, cost: CharmCost,
  ids: { charm: string; line: string }, date: string,
): CharmsAndLedger {
  const repurchase = current.charms.some(c => c.libraryId === lib.id)
  return {
    charms: addPurchase(current.charms, lib, pick, ids.charm),
    milestones: [...current.milestones, charmLine(lib, repurchase, cost, ids.line, date)],
  }
}

/** Undoes the latest purchase of `lib`, and drops the latest line that paid for one. */
export function undoCharmPurchase(current: CharmsAndLedger, lib: LibraryCharm): CharmsAndLedger {
  const last = current.milestones.findLastIndex(m => m.charm?.libraryId === lib.id)
  return {
    charms: undoPurchase(current.charms, lib),
    milestones: last === -1 ? current.milestones : current.milestones.filter((_, i) => i !== last),
  }
}

/** Removes a charm from the sheet with every line that paid for it: as if never bought. */
export function removeCharm(current: CharmsAndLedger, charmId: string): CharmsAndLedger {
  const charm = current.charms.find(c => c.id === charmId)
  if (!charm) return current
  return {
    charms: current.charms.filter(c => c.id !== charmId),
    milestones: current.milestones.filter(m => m.charm?.libraryId !== charm.libraryId),
  }
}

/** How many of each charm's purchases are still in training, by library id. */
export function trainingByCharm(milestones: MilestoneTransaction[], done: TrainingDone): Map<string, MilestoneTransaction[]> {
  const byCharm = new Map<string, MilestoneTransaction[]>()
  for (const line of inTraining(milestones, done)) {
    if (!line.charm) continue
    byCharm.set(line.charm.libraryId, [...(byCharm.get(line.charm.libraryId) ?? []), line])
  }
  return byCharm
}

/**
 * The charms as their effects see them: purchases still in training don't count.
 * A charm whose every purchase is in training has no effect at all; one with a
 * repurchase in training works at its trained count. Picks are one per purchase
 * for the charms with effects (Excellency, Ox Body), so the latest ones go first.
 */
export function charmsInEffect(charms: CharacterCharm[], training: Map<string, MilestoneTransaction[]>): CharacterCharm[] {
  return charms.flatMap(c => {
    const waiting = training.get(c.libraryId)?.length ?? 0
    if (waiting === 0) return [c]
    const trained = (c.count ?? 1) - waiting
    if (trained <= 0) return []
    return [{
      ...c,
      count: trained,
      picks: c.picks?.slice(0, trained),
      groupedPicks: c.groupedPicks?.slice(0, trained),
      oxBodyPicks: c.oxBodyPicks?.slice(0, trained),
    }]
  })
}
