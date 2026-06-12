import { useState } from 'react'
import type { MilestoneTransaction } from '../types/character'

const TYPES = ['personal', 'exalted', 'minor', 'major'] as const
type MType = typeof TYPES[number]

interface Props {
  milestones: MilestoneTransaction[]
  onChange: (milestones: MilestoneTransaction[]) => void
}

const emptyAmounts = { personal: '', exalted: '', minor: '', major: '' }

function toAmounts(tx: MilestoneTransaction) {
  return {
    personal: tx.personal ? String(tx.personal) : '',
    exalted: tx.exalted ? String(tx.exalted) : '',
    minor: tx.minor ? String(tx.minor) : '',
    major: tx.major ? String(tx.major) : '',
  }
}

function totalEarned(milestones: MilestoneTransaction[], type: MType) {
  return milestones
    .filter(m => m.kind === 'gain')
    .reduce((sum, m) => sum + (m[type] ?? 0), 0)
}

function balance(milestones: MilestoneTransaction[], type: MType) {
  return milestones.reduce((sum, m) => {
    return m.kind === 'gain'
      ? sum + (m[type] ?? 0)
      : sum - (m[type] ?? 0)
  }, 0)
}

export default function MilestonesTab({ milestones, onChange }: Props) {
  const [showGain, setShowGain] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [gainAmounts, setGainAmounts] = useState(emptyAmounts)
  const [gainDesc, setGainDesc] = useState('')
  const [purchaseAmounts, setPurchaseAmounts] = useState(emptyAmounts)
  const [purchaseDesc, setPurchaseDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmounts, setEditAmounts] = useState(emptyAmounts)
  const [editDesc, setEditDesc] = useState('')

  function addGain() {
    const vals = {
      personal: parseInt(gainAmounts.personal) || 0,
      exalted: parseInt(gainAmounts.exalted) || 0,
      minor: parseInt(gainAmounts.minor) || 0,
      major: parseInt(gainAmounts.major) || 0,
    }
    if (Object.values(vals).every(v => v === 0)) return
    const tx: MilestoneTransaction = {
      id: crypto.randomUUID(),
      kind: 'gain',
      ...vals,
      description: gainDesc.trim() || 'Session reward',
      date: new Date().toISOString(),
    }
    onChange([tx, ...milestones])
    setGainAmounts(emptyAmounts)
    setGainDesc('')
    setShowGain(false)
  }

  function addPurchase() {
    const vals = {
      personal: parseInt(purchaseAmounts.personal) || 0,
      exalted: parseInt(purchaseAmounts.exalted) || 0,
      minor: parseInt(purchaseAmounts.minor) || 0,
      major: parseInt(purchaseAmounts.major) || 0,
    }
    if (Object.values(vals).every(v => v === 0) || !purchaseDesc.trim()) return
    const tx: MilestoneTransaction = {
      id: crypto.randomUUID(),
      kind: 'purchase',
      ...vals,
      description: purchaseDesc.trim(),
      date: new Date().toISOString(),
    }
    onChange([tx, ...milestones])
    setPurchaseAmounts(emptyAmounts)
    setPurchaseDesc('')
    setShowPurchase(false)
  }

  function startEdit(tx: MilestoneTransaction) {
    setEditingId(tx.id)
    setEditAmounts(toAmounts(tx))
    setEditDesc(tx.description)
    setShowGain(false)
    setShowPurchase(false)
  }

  function saveEdit(tx: MilestoneTransaction) {
    const updated: MilestoneTransaction = {
      ...tx,
      personal: parseInt(editAmounts.personal) || 0,
      exalted: parseInt(editAmounts.exalted) || 0,
      minor: parseInt(editAmounts.minor) || 0,
      major: parseInt(editAmounts.major) || 0,
      description: editDesc.trim() || tx.description,
    }
    onChange(milestones.map(m => m.id === tx.id ? updated : m))
    setEditingId(null)
  }

  const sorted = [...milestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">

      {/* Totals row */}
      <div className="grid grid-cols-4 gap-3">
        {TYPES.map(type => (
          <div key={type} className="bg-stone-900 border border-stone-700 rounded-lg p-3 text-center">
            <div className="text-xs text-stone-400 mb-2 capitalize">{type}</div>
            <div className="text-lg font-bold text-amber-400">{balance(milestones, type)}</div>
            <div className="text-xs text-stone-500 mt-1">of {totalEarned(milestones, type)} earned</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowGain(v => !v); setShowPurchase(false); setEditingId(null) }}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Add Session Rewards
        </button>
        <button
          onClick={() => { setShowPurchase(v => !v); setShowGain(false); setEditingId(null) }}
          className="bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          − Make Purchase
        </button>
      </div>

      {/* Gain form */}
      {showGain && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Add Session Rewards</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TYPES.map(type => (
              <div key={type}>
                <label className="block text-xs text-stone-400 mb-1 capitalize">{type}</label>
                <input
                  type="number" min="0"
                  value={gainAmounts[type]}
                  onChange={e => setGainAmounts(a => ({ ...a, [type]: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Note (e.g. Session 5 — rescued the village)</label>
            <input
              type="text" value={gainDesc}
              onChange={e => setGainDesc(e.target.value)}
              placeholder="Session description…"
              className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addGain} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-4 py-1.5 text-sm transition-colors">Save</button>
            <button onClick={() => setShowGain(false)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Purchase form */}
      {showPurchase && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Make a Purchase</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TYPES.map(type => (
              <div key={type}>
                <label className="block text-xs text-stone-400 mb-1 capitalize">{type}</label>
                <input
                  type="number" min="0"
                  value={purchaseAmounts[type]}
                  onChange={e => setPurchaseAmounts(a => ({ ...a, [type]: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">What did you spend it on?</label>
            <input
              type="text" value={purchaseDesc}
              onChange={e => setPurchaseDesc(e.target.value)}
              placeholder="e.g. Bought Charm: Solar Flare"
              className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addPurchase} className="bg-red-700 hover:bg-red-600 text-white rounded px-4 py-1.5 text-sm transition-colors">Spend</button>
            <button onClick={() => setShowPurchase(false)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Log table */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-stone-400 border-b border-stone-700">
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
                <>
                  <tr key={tx.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        tx.kind === 'gain' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {tx.kind === 'gain' ? 'Gain' : 'Purchase'}
                      </span>
                    </td>
                    {TYPES.map(type => (
                      <td key={type} className="text-center py-2 px-2 font-mono">
                        {tx[type] > 0 ? (
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
                          onClick={() => editingId === tx.id ? setEditingId(null) : startEdit(tx)}
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
                      <td colSpan={7} className="px-3 py-3">
                        <div className="flex flex-wrap gap-3 items-end">
                          {TYPES.map(type => (
                            <div key={type}>
                              <label className="block text-xs text-stone-400 mb-1 capitalize">{type}</label>
                              <input
                                type="number" min="0"
                                value={editAmounts[type]}
                                onChange={e => setEditAmounts(a => ({ ...a, [type]: e.target.value }))}
                                placeholder="0"
                                className="w-16 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          ))}
                          <div className="flex-1 min-w-40">
                            <label className="block text-xs text-stone-400 mb-1">Description</label>
                            <input
                              type="text"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(tx)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1 text-sm transition-colors">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
