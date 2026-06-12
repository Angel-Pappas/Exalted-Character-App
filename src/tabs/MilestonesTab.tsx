import { useState } from 'react'
import type { MilestoneEntry, MilestoneType } from '../types/character'

const TYPES: { id: MilestoneType; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'exalted', label: 'Exalted' },
  { id: 'minor', label: 'Minor' },
  { id: 'major', label: 'Major' },
]

interface Props {
  milestones: MilestoneEntry[]
  onChange: (milestones: MilestoneEntry[]) => void
}

const emptyRewards = { personal: '', exalted: '', minor: '', major: '' }
const emptyPurchase = { type: 'personal' as MilestoneType, amount: '', reason: '' }

function totalEarned(milestones: MilestoneEntry[], type: MilestoneType) {
  return milestones
    .filter(m => m.type === type && m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0)
}

function balance(milestones: MilestoneEntry[], type: MilestoneType) {
  return milestones
    .filter(m => m.type === type)
    .reduce((sum, m) => sum + m.amount, 0)
}

export default function MilestonesTab({ milestones, onChange }: Props) {
  const [showRewards, setShowRewards] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [rewards, setRewards] = useState(emptyRewards)
  const [purchase, setPurchase] = useState(emptyPurchase)

  function addSessionRewards() {
    const entries: MilestoneEntry[] = []
    for (const { id } of TYPES) {
      const val = parseInt(rewards[id])
      if (!isNaN(val) && val !== 0) {
        entries.push({
          id: crypto.randomUUID(),
          type: id,
          description: 'Session reward',
          amount: val,
          date: new Date().toISOString(),
        })
      }
    }
    if (entries.length === 0) return
    onChange([...entries, ...milestones])
    setRewards(emptyRewards)
    setShowRewards(false)
  }

  function makePurchase() {
    const amount = parseInt(purchase.amount)
    if (isNaN(amount) || amount <= 0 || !purchase.reason.trim()) return
    const entry: MilestoneEntry = {
      id: crypto.randomUUID(),
      type: purchase.type,
      description: purchase.reason.trim(),
      amount: -amount,
      date: new Date().toISOString(),
    }
    onChange([entry, ...milestones])
    setPurchase(emptyPurchase)
    setShowPurchase(false)
  }

  const sorted = [...milestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">

      {/* Totals row */}
      <div className="grid grid-cols-4 gap-3">
        {TYPES.map(({ id, label }) => (
          <div key={id} className="bg-stone-900 border border-stone-700 rounded-lg p-3 text-center">
            <div className="text-xs text-stone-400 mb-2">{label}</div>
            <div className="text-lg font-bold text-amber-400">{balance(milestones, id)}</div>
            <div className="text-xs text-stone-500 mt-1">of {totalEarned(milestones, id)} earned</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowRewards(v => !v); setShowPurchase(false) }}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Add Session Rewards
        </button>
        <button
          onClick={() => { setShowPurchase(v => !v); setShowRewards(false) }}
          className="bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          − Make Purchase
        </button>
      </div>

      {/* Session rewards form */}
      {showRewards && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Add Session Rewards</h3>
          <div className="grid grid-cols-4 gap-3">
            {TYPES.map(({ id, label }) => (
              <div key={id}>
                <label className="block text-xs text-stone-400 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={rewards[id]}
                  onChange={e => setRewards(r => ({ ...r, [id]: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addSessionRewards} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-4 py-1.5 text-sm transition-colors">
              Save
            </button>
            <button onClick={() => setShowRewards(false)} className="text-stone-400 hover:text-stone-200 text-sm px-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Purchase form */}
      {showPurchase && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Make a Purchase</h3>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Type</label>
              <select
                value={purchase.type}
                onChange={e => setPurchase(p => ({ ...p, type: e.target.value as MilestoneType }))}
                className="bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
              >
                {TYPES.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Amount</label>
              <input
                type="number"
                min="1"
                value={purchase.amount}
                onChange={e => setPurchase(p => ({ ...p, amount: e.target.value }))}
                placeholder="1"
                className="w-20 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-stone-400 mb-1">Reason</label>
              <input
                type="text"
                value={purchase.reason}
                onChange={e => setPurchase(p => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Bought Charm: Solar Flare"
                className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={makePurchase} className="bg-red-700 hover:bg-red-600 text-white rounded px-4 py-1.5 text-sm transition-colors">
              Spend
            </button>
            <button onClick={() => setShowPurchase(false)} className="text-stone-400 hover:text-stone-200 text-sm px-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="space-y-1">
        {sorted.length === 0 && (
          <p className="text-stone-500 text-sm text-center py-8">No entries yet.</p>
        )}
        {sorted.map(entry => (
          <div key={entry.id} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-24 shrink-0">
                {new Date(entry.date).toLocaleDateString()}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                entry.type === 'personal' ? 'bg-sky-900 text-sky-300' :
                entry.type === 'exalted' ? 'bg-amber-900 text-amber-300' :
                entry.type === 'minor' ? 'bg-emerald-900 text-emerald-300' :
                'bg-purple-900 text-purple-300'
              }`}>
                {entry.type}
              </span>
              <span className="text-stone-300">{entry.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-semibold ${entry.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {entry.amount > 0 ? '+' : ''}{entry.amount}
              </span>
              <button
                onClick={() => onChange(milestones.filter(m => m.id !== entry.id))}
                className="text-stone-600 hover:text-red-400 text-xs ml-1 transition-colors"
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
