import { Fragment, useEffect, useState } from 'react'
import type { LibraryCharm, MilestoneKind, MilestoneTransaction, SheetData, TraitPurchase, TrainingDone } from '../types/character'
import { api } from '../lib/api'
import { Tooltip } from '../components/Tooltip'
import { TrainingCost } from '../components/TrainingCost'
import { CharmBrowseModal } from './SheetTab'
import type { CharmLibraryRow } from '../components/CharmLibraryTab'
import { sheetLibraryCharm } from '../lib/charmLibrary'
import type { ChoicePick } from '../lib/charmPurchase'
import { buyCharm, charmLine } from '../lib/charmTraining'
import { applyTrait, traitDescription } from '../lib/traitTraining'
import {
  KIND_LABELS, MILESTONE_TYPES, MILESTONE_USES, dateKey, formatDay, inTraining, isValidEntry, parseAmount,
  remaining, sortLedger, todayKey, totalEarned,
  type MilestoneAmounts, type MilestoneType,
} from '../lib/milestones'

interface Props {
  milestones: MilestoneTransaction[]
  sheet: SheetData
  trainingDone: TrainingDone
  // A purchase that buys a charm or dots changes the sheet too, in the same save.
  onChange: (milestones: MilestoneTransaction[], sheet?: SheetData) => void
  onTrainingDone: (lineId: string, finished: boolean) => void
}

const ATTRIBUTES = ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Appearance', 'Perception', 'Intelligence', 'Wits']
const ABILITIES = [
  'Athletics', 'Awareness', 'Close Combat', 'Craft', 'Embassy', 'Integrity', 'Navigate',
  'Performance', 'Physique', 'Presence', 'Ranged Combat', 'Sagacity', 'Stealth', 'War',
]

// What an Expense (or creation note) bought, as the form edits it. A charm
// needs choosing from the library first; the rest are picked in place.
type Bought =
  | { kind: 'none' }
  | { kind: 'charm'; lib: LibraryCharm | null; pick: ChoicePick | null }
  | { kind: 'ability'; name: string; dots: number }
  | { kind: 'attribute'; name: string }
  | { kind: 'specialty'; name: string; specialty: string }

// Form state keeps raw strings so a field can be blank while typing.
interface Draft {
  kind: MilestoneKind
  amounts: Record<MilestoneType, string>
  description: string
  date: string
  training: boolean   // Expenses only: still in training
  bought: Bought      // new entries only; an existing line's purchase is fixed
}

type Order = 'oldest' | 'newest'
const ORDER_KEY = 'milestones.order'

const blankAmounts = { personal: '', exalted: '', minor: '', major: '' }

const KIND_BADGE: Record<MilestoneKind, string> = {
  gain: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
  purchase: 'bg-red-950 text-red-300 border-red-900/60',
  creation: 'bg-stone-800 text-stone-300 border-stone-700',
}

const DESC_PLACEHOLDER: Record<MilestoneKind, string> = {
  gain: 'e.g. Session 26/9/26',
  purchase: 'e.g. Charm (Excellent Strike)',
  creation: 'e.g. Charm (Ox-Body Technique)',
}

const inputClass = 'w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500'
const labelClass = 'block text-[11px] text-stone-400 mb-1'
const smallBtn = 'text-xs px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:text-amber-300 hover:border-amber-500 transition-colors'

// A new Expense starts a training unless the player unticks it (e.g. a reward the Storyteller grants at once).
function newDraft(kind: MilestoneKind): Draft {
  return { kind, amounts: blankAmounts, description: '', date: kind === 'creation' ? '' : todayKey(), training: true, bought: { kind: 'none' } }
}

function draftFrom(tx: MilestoneTransaction, training: boolean): Draft {
  const amounts = { ...blankAmounts }
  for (const t of MILESTONE_TYPES) amounts[t] = tx[t] ? String(tx[t]) : ''
  return { kind: tx.kind, amounts, description: tx.description, date: dateKey(tx.date), training, bought: { kind: 'none' } }
}

function parsedAmounts(draft: Draft): MilestoneAmounts {
  // Creation notes are free by definition, whatever was typed before switching kind.
  if (draft.kind === 'creation') return { personal: 0, exalted: 0, minor: 0, major: 0 }
  return {
    personal: parseAmount(draft.amounts.personal),
    exalted: parseAmount(draft.amounts.exalted),
    minor: parseAmount(draft.amounts.minor),
    major: parseAmount(draft.amounts.major),
  }
}

/** The trait a draft buys, once every part of it is filled in. */
function draftTrait(bought: Bought): TraitPurchase | null {
  switch (bought.kind) {
    case 'ability': return bought.name ? { kind: 'ability', name: bought.name, dots: bought.dots } : null
    case 'attribute': return bought.name ? { kind: 'attribute', name: bought.name, dots: 1 } : null
    case 'specialty': return bought.name && bought.specialty.trim() ? { kind: 'specialty', name: bought.name, specialty: bought.specialty.trim() } : null
    default: return null
  }
}

/** The description a purchase gets when the player leaves it blank. */
function autoDescription(bought: Bought, sheet: SheetData, repurchase: boolean): string {
  if (bought.kind === 'charm') return bought.lib ? charmLine(bought.lib, repurchase, { kind: 'creation' }, '', '').description : ''
  const trait = draftTrait(bought)
  if (!trait) return ''
  const current = trait.kind === 'attribute' ? sheet.attributes?.[trait.name] ?? 0 : sheet.abilities?.[trait.name]?.rating ?? 0
  return traitDescription(trait, current)
}

/** Whether the "bought" part is complete: nothing chosen counts as complete. */
function boughtComplete(bought: Bought): boolean {
  if (bought.kind === 'none') return true
  if (bought.kind === 'charm') return bought.lib !== null
  return draftTrait(bought) !== null
}

function readOrder(): Order {
  try {
    return localStorage.getItem(ORDER_KEY) === 'oldest' ? 'oldest' : 'newest'
  } catch {
    return 'newest'
  }
}

function SpendOptions({ type }: { type: MilestoneType }) {
  return (
    <div className="min-w-44">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
        Spend <span className="capitalize">{type}</span> on
      </div>
      <ul className="space-y-1">
        {MILESTONE_USES[type].map(use => (
          <li key={use} className="flex gap-2">
            <span className="text-amber-500/70">◆</span>
            <span>{use}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// What a new Expense or creation note bought: a charm (chosen in the library
// browser), ability dots, an attribute dot or a specialty. It lands on the sheet
// when the entry is saved.
function BoughtFields({ bought, onChange, onChooseCharm }: { bought: Bought; onChange: (b: Bought) => void; onChooseCharm: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className={labelClass}>What it bought (added to the sheet)</label>
        <select value={bought.kind} aria-label="What it bought" className={`${inputClass} !w-auto`}
          onChange={e => {
            const k = e.target.value as Bought['kind']
            onChange(k === 'charm' ? { kind: 'charm', lib: null, pick: null }
              : k === 'ability' ? { kind: 'ability', name: '', dots: 1 }
              : k === 'attribute' ? { kind: 'attribute', name: '' }
              : k === 'specialty' ? { kind: 'specialty', name: '', specialty: '' }
              : { kind: 'none' })
            if (k === 'charm') onChooseCharm()
          }}>
          <option value="none">Nothing on the sheet</option>
          <option value="charm">A charm</option>
          <option value="ability">Ability dots</option>
          <option value="attribute">An attribute dot</option>
          <option value="specialty">A specialty</option>
        </select>
      </div>
      {bought.kind === 'charm' && (
        <div className="flex items-center gap-2 pb-1">
          {bought.lib
            ? <span className="text-sm text-amber-300">{bought.lib.name}{typeof bought.pick === 'string' ? ` (${bought.pick})` : ''}</span>
            : <span className="text-sm text-stone-500">No charm chosen</span>}
          <button type="button" onClick={onChooseCharm} className={smallBtn}>{bought.lib ? 'Change' : 'Choose charm…'}</button>
        </div>
      )}
      {(bought.kind === 'ability' || bought.kind === 'specialty') && (
        <div>
          <label className={labelClass}>Ability</label>
          <select value={bought.name} onChange={e => onChange({ ...bought, name: e.target.value })} aria-label="Ability" className={`${inputClass} !w-40`}>
            <option value="">Choose…</option>
            {ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {bought.kind === 'ability' && (
        <div>
          <label className={labelClass}>Dots</label>
          <select value={bought.dots} onChange={e => onChange({ ...bought, dots: Number(e.target.value) })} aria-label="Dots" className={`${inputClass} !w-16`}>
            {[1, 2, 3].map(n => <option key={n} value={n}>+{n}</option>)}
          </select>
        </div>
      )}
      {bought.kind === 'attribute' && (
        <div>
          <label className={labelClass}>Attribute (+1)</label>
          <select value={bought.name} onChange={e => onChange({ ...bought, name: e.target.value })} aria-label="Attribute" className={`${inputClass} !w-40`}>
            <option value="">Choose…</option>
            {ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {bought.kind === 'specialty' && (
        <div className="flex-1 min-w-40">
          <label className={labelClass}>Specialty</label>
          <input value={bought.specialty} onChange={e => onChange({ ...bought, specialty: e.target.value })} placeholder="e.g. Ambushes" aria-label="Specialty" className={inputClass} />
        </div>
      )}
    </div>
  )
}

// New entries take today's date automatically; the edit form lets a misplaced
// one be moved (the date only decides its place in the log).
function EntryFields({ draft, setDraft, isNew, placeholder, onChooseCharm }: {
  draft: Draft
  setDraft: (d: Draft) => void
  isNew: boolean
  placeholder: string
  onChooseCharm: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass}>Type</label>
          <select
            value={draft.kind}
            onChange={e => setDraft({ ...draft, kind: e.target.value as MilestoneKind })}
            className={`${inputClass} !w-36`}
          >
            {(Object.keys(KIND_LABELS) as MilestoneKind[]).map(k => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        {draft.kind !== 'creation' && MILESTONE_TYPES.map(type => (
          <div key={type} className="w-20">
            <label className={`${labelClass} capitalize`}>{type}</label>
            <input
              type="number" min="0"
              value={draft.amounts[type]}
              onChange={e => setDraft({ ...draft, amounts: { ...draft.amounts, [type]: e.target.value } })}
              placeholder="0"
              className={inputClass}
            />
          </div>
        ))}
        {!isNew && draft.kind !== 'creation' && (
          <div>
            <label className={labelClass}>Date (sets its place)</label>
            <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} className={inputClass} />
          </div>
        )}
      </div>
      {draft.kind === 'creation' && (
        <p className="text-xs text-stone-500">Bought with the starting build — recorded for reference, costs no milestones.</p>
      )}
      {isNew && draft.kind !== 'gain' && (
        <BoughtFields bought={draft.bought} onChange={bought => setDraft({ ...draft, bought })} onChooseCharm={onChooseCharm} />
      )}
      <div>
        <label className={labelClass}>Description{placeholder ? ' (optional)' : ''}</label>
        <input
          type="text"
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
          placeholder={placeholder || DESC_PLACEHOLDER[draft.kind]}
          className={inputClass}
        />
      </div>
      {draft.kind === 'purchase' && (
        <label className="flex items-center gap-2 text-sm text-stone-300 w-fit cursor-pointer">
          <input
            type="checkbox"
            checked={draft.training}
            onChange={e => setDraft({ ...draft, training: e.target.checked })}
            className="accent-amber-500"
          />
          In training
          <span className="text-xs text-stone-500">— you or the Storyteller mark it done when the story says so</span>
        </label>
      )}
    </div>
  )
}

export default function MilestonesTab({ milestones, sheet, trainingDone, onChange, onTrainingDone }: Props) {
  const [adding, setAdding] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(newDraft('gain'))
  const [order, setOrder] = useState<Order>(readOrder)
  const [browsing, setBrowsing] = useState(false)
  const [library, setLibrary] = useState<LibraryCharm[] | null>(null)

  // The charm library loads only when a charm is first chosen here.
  useEffect(() => {
    if (!browsing || library) return
    api<CharmLibraryRow[]>('GET', 'charms').then(({ data }) => setLibrary((data ?? []).map(sheetLibraryCharm)))
  }, [browsing, library])

  function toggleOrder() {
    const next: Order = order === 'newest' ? 'oldest' : 'newest'
    setOrder(next)
    try { localStorage.setItem(ORDER_KEY, next) } catch { /* order is a convenience; ignore blocked storage */ }
  }

  function openAdd(kind: MilestoneKind) {
    setAdding(a => (a?.kind === kind ? null : newDraft(kind)))
    setEditingId(null)
  }

  const charms = sheet.charms ?? []
  const sorted = sortLedger(milestones, order)
  const training = inTraining(milestones, trainingDone)
  const isRepurchase = (bought: Bought) => bought.kind === 'charm' && bought.lib !== null && charms.some(c => c.libraryId === bought.lib?.id)
  // Something bought on the sheet names itself, so its description may stay blank.
  const addValid = adding !== null && boughtComplete(adding.bought)
    && isValidEntry(adding.kind, parsedAmounts(adding), adding.description, adding.kind !== 'gain' && adding.bought.kind !== 'none')
  const spendsNothing = (d: Draft) => d.kind === 'purchase' && MILESTONE_TYPES.every(t => parsedAmounts(d)[t] === 0)
  const editValid = isValidEntry(editDraft.kind, parsedAmounts(editDraft), editDraft.description)

  function saveAdd() {
    if (!adding || !addValid) return
    const amounts = parsedAmounts(adding)
    const description = adding.description.trim()
    const { bought } = adding
    const inTrainingNow = adding.kind === 'purchase' && adding.training

    if (bought.kind === 'charm' && bought.lib) {
      const cost = adding.kind === 'creation' ? { kind: 'creation' as const } : { kind: 'purchase' as const, amounts, training: inTrainingNow }
      const next = buyCharm({ charms, milestones }, bought.lib, bought.pick, cost, { charm: crypto.randomUUID(), line: crypto.randomUUID() }, adding.date)
      const lines = description
        ? next.milestones.map((m, i) => (i === next.milestones.length - 1 ? { ...m, description } : m))
        : next.milestones
      onChange(lines, { ...sheet, charms: next.charms })
    } else {
      const trait = adding.kind === 'gain' ? null : draftTrait(bought)
      const tx: MilestoneTransaction = {
        id: crypto.randomUUID(),
        kind: adding.kind,
        ...amounts,
        description: description || autoDescription(bought, sheet, false) || 'Session',
        date: adding.date,
        ...(inTrainingNow ? { training: true } : {}),
        ...(trait ? { trait } : {}),
      }
      // Appended, so entries sharing a date keep the order they were logged in.
      if (trait) onChange([...milestones, tx], { ...sheet, ...applyTrait({ attributes: sheet.attributes ?? {}, abilities: sheet.abilities ?? {} }, trait) })
      else onChange([...milestones, tx])
    }
    setAdding(null)
  }

  function startEdit(tx: MilestoneTransaction) {
    setEditingId(tx.id)
    setEditDraft(draftFrom(tx, training.includes(tx)))
    setAdding(null)
  }

  function saveEdit(tx: MilestoneTransaction) {
    const amounts = parsedAmounts(editDraft)
    if (!isValidEntry(editDraft.kind, amounts, editDraft.description)) return
    const wasTraining = training.includes(tx)
    const nowTraining = editDraft.kind === 'purchase' && editDraft.training
    const updated: MilestoneTransaction = {
      ...tx,
      kind: editDraft.kind,
      ...amounts,
      description: editDraft.description.trim() || tx.description,
      date: editDraft.date,
      // Once tracked, a line stays tracked: unticking means "done", not "never trained".
      ...(nowTraining ? { training: true } : {}),
    }
    onChange(milestones.map(m => (m.id === tx.id ? updated : m)))
    setEditingId(null)
    if (wasTraining && !nowTraining && editDraft.kind === 'purchase') onTrainingDone(tx.id, true)
    if (!wasTraining && nowTraining && tx.id in trainingDone) onTrainingDone(tx.id, false)
  }

  // A charm chosen in the browser goes into the new entry's form.
  function chooseCharm(lib: LibraryCharm, pick: ChoicePick | null) {
    setAdding(a => (a ? { ...a, bought: { kind: 'charm', lib, pick } } : a))
    setBrowsing(false)
  }

  const actionBtn = 'font-semibold rounded px-3 py-1.5 text-sm transition-colors'

  return (
    <div className="px-4 py-4 max-w-[96rem] mx-auto grid gap-4 grid-cols-[minmax(0,1fr)_20rem] items-start">
      {browsing && (
        <CharmBrowseModal
          library={library ?? []}
          loading={library === null}
          existing={charms}
          exaltType={sheet.exaltType ?? ''}
          caste={sheet.caste ?? ''}
          abilities={sheet.abilities ?? {}}
          attributes={sheet.attributes ?? {}}
          essence={sheet.essence ?? 1}
          onAdd={chooseCharm}
          onClose={() => setBrowsing(false)}
        />
      )}

      {/* The ledger, from the very top of the page. */}
      <main className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => openAdd('gain')} className={`${actionBtn} bg-amber-600 hover:bg-amber-500 text-white`}>+ Add Income</button>
          <button onClick={() => openAdd('purchase')} className={`${actionBtn} bg-stone-700 hover:bg-stone-600 text-white`}>− Add Expense</button>
          <button onClick={() => openAdd('creation')} className={`${actionBtn} bg-stone-800 hover:bg-stone-700 text-stone-300`}>+ Char. Creation</button>
          {milestones.length > 1 && (
            <button onClick={toggleOrder} className="ml-auto text-xs text-stone-400 hover:text-amber-400 transition-colors">
              {order === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
            </button>
          )}
        </div>

        {adding && (
          <form className="bg-stone-900 border border-stone-700 rounded-lg p-3 space-y-3" onSubmit={e => { e.preventDefault(); saveAdd() }}>
            <EntryFields draft={adding} setDraft={setAdding} isNew
              placeholder={adding.kind === 'gain' ? '' : autoDescription(adding.bought, sheet, isRepurchase(adding.bought))}
              onChooseCharm={() => setBrowsing(true)} />
            <div className="flex gap-2">
              <button type="submit" disabled={!addValid}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded px-4 py-1.5 text-sm transition-colors">
                Save
              </button>
              <button type="button" onClick={() => setAdding(null)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
              {spendsNothing(adding) && <span className="self-center text-xs text-stone-500">An Expense needs the milestones it spent.</span>}
            </div>
          </form>
        )}

        {sorted.length > 0 ? (
          <div className="rounded-lg border border-stone-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-stone-500 bg-stone-900/80 border-b border-stone-800">
                  <th className="text-left py-2 pl-3 pr-2 font-medium w-32">Type</th>
                  {MILESTONE_TYPES.map(t => <th key={t} className="text-center py-2 px-1 font-medium w-20">{t}</th>)}
                  <th className="text-left py-2 pl-3 font-medium">Description</th>
                  <th className="py-2 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(tx => (
                  <Fragment key={tx.id}>
                    <tr className="group border-b border-stone-800/70 last:border-0 hover:bg-stone-900/60">
                      <td className="py-1.5 pl-3 pr-2">
                        <span className={`text-[11px] font-semibold px-1.5 py-px rounded border whitespace-nowrap ${KIND_BADGE[tx.kind]}`}>
                          {KIND_LABELS[tx.kind]}
                        </span>
                      </td>
                      {MILESTONE_TYPES.map(type => (
                        <td key={type} className="text-center py-1.5 px-1 font-mono">
                          {tx.kind !== 'creation' && tx[type] > 0 ? (
                            <span className={tx.kind === 'gain' ? 'text-emerald-400' : 'text-red-400'}>
                              {tx.kind === 'gain' ? '+' : '−'}{tx[type]}
                            </span>
                          ) : (
                            <span className="text-stone-700">·</span>
                          )}
                        </td>
                      ))}
                      <td className="py-1.5 pl-3 text-stone-300">{tx.description}</td>
                      <td className="py-1.5 pr-3">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => (editingId === tx.id ? setEditingId(null) : startEdit(tx))}
                            className="text-stone-400 hover:text-amber-400 transition-colors"
                            data-tip="Edit" aria-label="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onChange(milestones.filter(m => m.id !== tx.id))}
                            className="text-stone-400 hover:text-red-400 text-xs transition-colors"
                            data-tip="Delete" aria-label="Delete"
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                    {editingId === tx.id && (
                      <tr className="border-b border-stone-800 bg-stone-900">
                        <td colSpan={7} className="px-3 py-3 space-y-3">
                          <EntryFields draft={editDraft} setDraft={setEditDraft} isNew={false} placeholder="" onChooseCharm={() => {}} />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(tx)}
                              disabled={!editValid}
                              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded px-3 py-1 text-sm transition-colors"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
                            {spendsNothing(editDraft) && <span className="self-center text-xs text-stone-500">An Expense needs the milestones it spent.</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-stone-500 text-sm text-center py-8">No entries yet.</p>
        )}
      </main>

      {/* Beside the ledger: what is left to spend, and what is in training. */}
      <aside className="space-y-3 sticky top-4">
        <div className="grid grid-cols-2 gap-2">
          {MILESTONE_TYPES.map(type => {
            const left = remaining(milestones, type)
            return (
              <Tooltip
                key={type}
                content={<SpendOptions type={type} />}
                className="group cursor-help rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2 transition-colors hover:border-amber-500/50"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 group-hover:text-amber-300 transition-colors">{type}</div>
                <div className="font-mono leading-tight" data-tip="Remaining / total earned">
                  <span className={`text-2xl font-bold ${left > 0 ? 'text-amber-400' : left < 0 ? 'text-red-400' : 'text-stone-500'}`}>{left}</span>
                  <span className="text-sm text-stone-500"> / {totalEarned(milestones, type)}</span>
                </div>
              </Tooltip>
            )
          })}
        </div>

        <section className="rounded-lg border border-amber-800/40 bg-stone-900/70">
          <h2 className="flex items-baseline justify-between px-3 pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400">
            In training
            {training.length > 0 && <span className="text-stone-500 font-normal">{training.length}</span>}
          </h2>
          {training.length === 0 ? (
            <p className="px-3 pb-3 text-xs text-stone-500">Nothing in training. New Expenses start here.</p>
          ) : (
            <ul className="pb-1">
              {training.map(tx => (
                <li key={tx.id} className="flex items-center gap-2 px-3 py-1.5 border-t border-stone-800/70">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-stone-100 leading-snug">{tx.description}</div>
                    <div className="text-[11px] text-stone-500">
                      <TrainingCost entry={tx} />
                      {dateKey(tx.date) && <> · since {formatDay(dateKey(tx.date))}</>}
                    </div>
                  </div>
                  <button onClick={() => onTrainingDone(tx.id, true)} className={smallBtn}>Done</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
