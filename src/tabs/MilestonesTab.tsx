import { Fragment, useState } from 'react'
import type { MilestoneKind, MilestoneTransaction } from '../types/character'
import {
  KIND_LABELS, MILESTONE_TYPES, dateKey, formatDate, isValidEntry, parseAmount,
  remaining, sortLedger, todayKey, totalEarned, totalSpent,
  type MilestoneAmounts, type MilestoneType,
} from '../lib/milestones'

interface Props {
  milestones: MilestoneTransaction[]
  onChange: (milestones: MilestoneTransaction[]) => void
}

// Form state keeps raw strings so a field can be blank while typing.
interface Draft {
  kind: MilestoneKind
  amounts: Record<MilestoneType, string>
  description: string
  date: string
}

type Order = 'oldest' | 'newest'
const ORDER_KEY = 'milestones.order'

const blankAmounts = { personal: '', exalted: '', minor: '', major: '' }

const KIND_BADGE: Record<MilestoneKind, string> = {
  gain: 'bg-emerald-900 text-emerald-300',
  purchase: 'bg-red-900 text-red-300',
  creation: 'bg-stone-700 text-stone-300',
}

const DESC_PLACEHOLDER: Record<MilestoneKind, string> = {
  gain: 'e.g. Session 26/9/26',
  purchase: 'e.g. Charm (Excellent Strike)',
  creation: 'e.g. Charm (Ox-Body Technique)',
}

const inputClass = 'w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500'

function newDraft(kind: MilestoneKind): Draft {
  return { kind, amounts: blankAmounts, description: '', date: kind === 'creation' ? '' : todayKey() }
}

function draftFrom(tx: MilestoneTransaction): Draft {
  const amounts = { ...blankAmounts }
  for (const t of MILESTONE_TYPES) amounts[t] = tx[t] ? String(tx[t]) : ''
  return { kind: tx.kind, amounts, description: tx.description, date: dateKey(tx.date) }
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

function readOrder(): Order {
  try {
    return localStorage.getItem(ORDER_KEY) === 'oldest' ? 'oldest' : 'newest'
  } catch {
    return 'newest'
  }
}

function EntryFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Type</label>
          <select
            value={draft.kind}
            onChange={e => setDraft({ ...draft, kind: e.target.value as MilestoneKind })}
            className={inputClass}
          >
            {(Object.keys(KIND_LABELS) as MilestoneKind[]).map(k => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">Date (optional)</label>
          <input
            type="date"
            value={draft.date}
            onChange={e => setDraft({ ...draft, date: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      {draft.kind === 'creation' ? (
        <p className="text-xs text-stone-500">Bought with the starting build — recorded for reference, costs no milestones.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MILESTONE_TYPES.map(type => (
            <div key={type}>
              <label className="block text-xs text-stone-400 mb-1 capitalize">{type}</label>
              <input
                type="number" min="0"
                value={draft.amounts[type]}
                onChange={e => setDraft({ ...draft, amounts: { ...draft.amounts, [type]: e.target.value } })}
                placeholder="0"
                className={inputClass}
              />
            </div>
          ))}
        </div>
      )}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Description</label>
        <input
          type="text"
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
          placeholder={DESC_PLACEHOLDER[draft.kind]}
          className={inputClass}
        />
      </div>
    </div>
  )
}

export default function MilestonesTab({ milestones, onChange }: Props) {
  const [adding, setAdding] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(newDraft('gain'))
  const [order, setOrder] = useState<Order>(readOrder)

  function toggleOrder() {
    const next: Order = order === 'newest' ? 'oldest' : 'newest'
    setOrder(next)
    try { localStorage.setItem(ORDER_KEY, next) } catch { /* order is a convenience; ignore blocked storage */ }
  }

  function openAdd(kind: MilestoneKind) {
    setAdding(a => (a?.kind === kind ? null : newDraft(kind)))
    setEditingId(null)
  }

  function saveAdd() {
    if (!adding) return
    const amounts = parsedAmounts(adding)
    if (!isValidEntry(adding.kind, amounts, adding.description)) return
    const tx: MilestoneTransaction = {
      id: crypto.randomUUID(),
      kind: adding.kind,
      ...amounts,
      description: adding.description.trim() || 'Session',
      date: adding.date,
    }
    // Appended, so entries sharing a date keep the order they were logged in.
    onChange([...milestones, tx])
    setAdding(null)
  }

  function startEdit(tx: MilestoneTransaction) {
    setEditingId(tx.id)
    setEditDraft(draftFrom(tx))
    setAdding(null)
  }

  function saveEdit(tx: MilestoneTransaction) {
    const amounts = parsedAmounts(editDraft)
    if (!isValidEntry(editDraft.kind, amounts, editDraft.description)) return
    const updated: MilestoneTransaction = {
      ...tx,
      kind: editDraft.kind,
      ...amounts,
      description: editDraft.description.trim() || tx.description,
      date: editDraft.date,
    }
    onChange(milestones.map(m => (m.id === tx.id ? updated : m)))
    setEditingId(null)
  }

  const sorted = sortLedger(milestones, order)
  const addValid = adding ? isValidEntry(adding.kind, parsedAmounts(adding), adding.description) : false
  const editValid = isValidEntry(editDraft.kind, parsedAmounts(editDraft), editDraft.description)

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">

      {/* Totals — Remaining big, Total and Spent underneath (the spreadsheet's two summary rows) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MILESTONE_TYPES.map(type => (
          <div key={type} className="bg-stone-900 border border-stone-700 rounded-lg p-3 text-center">
            <div className="text-xs text-stone-400 mb-1 capitalize">{type}</div>
            <div className="text-2xl font-bold text-amber-400">{remaining(milestones, type)}</div>
            <div className="text-[11px] text-stone-500 uppercase tracking-wide">remaining</div>
            <div className="text-xs text-stone-500 mt-1">
              {totalEarned(milestones, type)} earned · {totalSpent(milestones, type)} spent
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => openAdd('gain')}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Add Income
        </button>
        <button
          onClick={() => openAdd('purchase')}
          className="bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          − Add Expense
        </button>
        <button
          onClick={() => openAdd('creation')}
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Char. Creation
        </button>
        {milestones.length > 1 && (
          <button
            onClick={toggleOrder}
            className="ml-auto text-xs text-stone-400 hover:text-amber-400 transition-colors"
          >
            {order === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">New entry</h3>
          <EntryFields draft={adding} setDraft={setAdding} />
          <div className="flex gap-2">
            <button
              onClick={saveAdd}
              disabled={!addValid}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded px-4 py-1.5 text-sm transition-colors"
            >
              Save
            </button>
            <button onClick={() => setAdding(null)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Ledger */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-stone-400 border-b border-stone-700">
                <th className="text-left py-2 pr-3 font-medium">Date</th>
                <th className="text-left py-2 pr-3 font-medium">Type</th>
                <th className="text-center py-2 px-2 font-medium">Personal</th>
                <th className="text-center py-2 px-2 font-medium">Exalted</th>
                <th className="text-center py-2 px-2 font-medium">Minor</th>
                <th className="text-center py-2 px-2 font-medium">Major</th>
                <th className="text-left py-2 pl-3 font-medium">Description</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(tx => (
                <Fragment key={tx.id}>
                  <tr className="border-b border-stone-800 hover:bg-stone-900/50">
                    <td className="py-2 pr-3 text-xs text-stone-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${KIND_BADGE[tx.kind]}`}>
                        {KIND_LABELS[tx.kind]}
                      </span>
                    </td>
                    {MILESTONE_TYPES.map(type => (
                      <td key={type} className="text-center py-2 px-2 font-mono">
                        {tx.kind !== 'creation' && tx[type] > 0 ? (
                          <span className={tx.kind === 'gain' ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.kind === 'gain' ? '+' : '-'}{tx[type]}
                          </span>
                        ) : (
                          <span className="text-stone-700">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-stone-300">{tx.description}</td>
                    <td className="py-2 pl-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => (editingId === tx.id ? setEditingId(null) : startEdit(tx))}
                          className="text-stone-600 hover:text-amber-400 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onChange(milestones.filter(m => m.id !== tx.id))}
                          className="text-stone-600 hover:text-red-400 text-xs transition-colors"
                          title="Delete"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === tx.id && (
                    <tr className="border-b border-stone-700 bg-stone-900">
                      <td colSpan={8} className="px-3 py-3 space-y-3">
                        <EntryFields draft={editDraft} setDraft={setEditDraft} />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(tx)}
                            disabled={!editValid}
                            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded px-3 py-1 text-sm transition-colors"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-stone-500 text-sm text-center py-8">No entries yet.</p>
      )}
    </div>
  )
}
