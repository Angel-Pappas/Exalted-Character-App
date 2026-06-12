import { useState } from 'react'
import type { NpcEntry } from '../types/character'

interface Props {
  npcs: NpcEntry[]
  onChange: (npcs: NpcEntry[]) => void
}

export default function CharactersTab({ npcs, onChange }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const current = npcs.find(n => n.id === selected) ?? null

  function addNpc() {
    if (!newName.trim()) return
    const npc: NpcEntry = { id: crypto.randomUUID(), name: newName.trim(), notes: '' }
    onChange([...npcs, npc])
    setNewName('')
    setSelected(npc.id)
  }

  function updateNotes(id: string, notes: string) {
    onChange(npcs.map(n => n.id === id ? { ...n, notes } : n))
  }

  function removeNpc(id: string) {
    onChange(npcs.filter(n => n.id !== id))
    if (selected === id) setSelected(null)
  }

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Sidebar */}
      <div className="w-48 md:w-56 shrink-0 border-r border-stone-700 flex flex-col">
        <div className="p-3 border-b border-stone-700">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New character…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNpc()}
              className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
            <button
              onClick={addNpc}
              className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-1 text-xs transition-colors"
            >+</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {npcs.length === 0 && (
            <p className="text-xs text-stone-500 p-3">No characters yet.</p>
          )}
          {npcs.map(npc => (
            <div
              key={npc.id}
              onClick={() => setSelected(npc.id)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm group ${
                selected === npc.id ? 'bg-stone-700 text-amber-400' : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span className="truncate">{npc.name}</span>
              <button
                onClick={e => { e.stopPropagation(); removeNpc(npc.id) }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs ml-1"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col p-4">
        {!current ? (
          <p className="text-stone-500 text-sm mt-8 text-center">Select or create a character.</p>
        ) : (
          <>
            <h2 className="text-amber-400 font-semibold text-lg mb-3">{current.name}</h2>
            <textarea
              value={current.notes}
              onChange={e => updateNotes(current.id, e.target.value)}
              placeholder="Notes about this character…"
              className="flex-1 bg-stone-900 border border-stone-700 text-stone-100 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-amber-500 placeholder-stone-600"
            />
          </>
        )}
      </div>
    </div>
  )
}
