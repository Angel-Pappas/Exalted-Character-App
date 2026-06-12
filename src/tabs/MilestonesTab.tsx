import { useState } from 'react'
import type { MilestoneEntry, MilestoneType } from '../types/character'

const MILESTONE_TYPES: { id: MilestoneType; label: string; color: string }[] = [
  { id: 'personal', label: 'Personal', color: 'text-sky-400 border-sky-700 bg-sky-950' },
  { id: 'exalted', label: 'Exalted', color: 'text-amber-400 border-amber-700 bg-amber-950' },
  { id: 'minor', label: 'Minor', color: 'text-emerald-400 border-emerald-700 bg-emerald-950' },
  { id: 'major', label: 'Major', color: 'text-purple-400 border-purple-700 bg-purple-950' },
]

interface Props {
  milestones: MilestoneEntry[]
  onChange: (milestones: MilestoneEntry[]) => void
}

interface AddForm {
  description: string
  amount: string
}

const emptyForm: AddForm = { description: '', amount: '' }

export default function MilestonesTab({ milestones, onChange }: Props) {
  const [forms, setForms] = useState<Record<MilestoneType, AddForm>>({
    personal: emptyForm,
    exalted: emptyForm,
    minor: emptyForm,
    major: emptyForm,
  })

  function total(type: MilestoneType) {
    return milestones
      .filter(m => m.type === type)
      .reduce((sum, m) => sum + m.amount, 0)
  }

  function entriesFor(type: MilestoneType) {
    return milestones.filter(m => m.type === type)
  }

  function addEntry(type: MilestoneType) {
    const form = forms[type]
    const amount = parseInt(form.amount)
    if (!form.description.trim() || isNaN(amount)) return

    const entry: MilestoneEntry = {
      id: crypto.randomUUID(),
      type,
      description: form.description.trim(),
      amount,
      date: new Date().toISOString(),
    }
    onChange([...milestones, entry])
    setForms(f => ({ ...f, [type]: emptyForm }))
  }

  function removeEntry(id: string) {
    onChange(milestones.filter(m => m.id !== id))
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {MILESTONE_TYPES.map(({ id, label, color }) => (
        <div key={id} className={`rounded-lg border p-4 ${color}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">{label}</h2>
            <span className="text-sm font-mono">Total: {total(id)}</span>
          </div>

          <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
            {entriesFor(id).length === 0 && (
              <p className="text-xs opacity-50">No entries yet.</p>
            )}
            {entriesFor(id).map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm bg-black/20 rounded px-2 py-1">
                <span className="flex-1 truncate">{entry.description}</span>
                <span className={`ml-2 font-mono font-semibold ${entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount}
                </span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="ml-2 opacity-40 hover:opacity-100 text-xs"
                >✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Description"
              value={forms[id].description}
              onChange={e => setForms(f => ({ ...f, [id]: { ...f[id], description: e.target.value } }))}
              className="flex-1 bg-black/30 border border-stone-600 rounded px-2 py-1 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-400"
            />
            <input
              type="number"
              placeholder="±XP"
              value={forms[id].amount}
              onChange={e => setForms(f => ({ ...f, [id]: { ...f[id], amount: e.target.value } }))}
              className="w-16 bg-black/30 border border-stone-600 rounded px-2 py-1 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-400"
            />
            <button
              onClick={() => addEntry(id)}
              className="bg-stone-700 hover:bg-stone-600 text-white rounded px-3 py-1 text-sm transition-colors"
            >Add</button>
          </div>
        </div>
      ))}
    </div>
  )
}
