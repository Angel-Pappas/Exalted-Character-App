import { useState } from 'react'
import ModalPortal from './ModalPortal'
import type { IntimacyEntry } from '../types/character'
import { protectable } from '../lib/charmUse'

// The small windows a charm asks when it is bought or used (Angel, 2026-10-16):
// Ward of the Sun's ward, an ally for each Unconquered Sun's Sight repurchase,
// and the Intimacy Righteous Lion Spirit protects. "Later" leaves the choice
// open; the charm then shows its "!" until it is made in the charm window.

const inputCls = 'w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500'
const laterBtn = 'text-stone-400 hover:text-stone-200 text-sm px-2'
const saveBtn = 'bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded px-4 py-1.5 text-sm transition-colors'

function Frame({ title, hint, onClose, children }: { title: string; hint: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="w-[26rem] max-w-[95vw] rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
          <div>
            <h2 className="text-sm font-semibold text-amber-400">{title}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{hint}</p>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  )
}

/** Asks for a name (Ward of the Sun's ward, an ally). */
export function NamePromptModal({ title, hint, label, onSave, onClose }: {
  title: string
  hint: string
  label: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  return (
    <Frame title={title} hint={hint} onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (name.trim()) onSave(name.trim()) }}>
        <input id="charm-choice-name" autoFocus value={name} onChange={e => setName(e.target.value)} aria-label={label} placeholder={label} className={inputCls} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={laterBtn}>Later</button>
          <button type="submit" disabled={!name.trim()} className={saveBtn}>Save</button>
        </div>
      </form>
    </Frame>
  )
}

/** Righteous Lion Spirit: which Major or Defining Intimacy it protects. */
export function IntimacyPickModal({ intimacies, onPick, onClose }: {
  intimacies: IntimacyEntry[]
  onPick: (intimacyId: string) => void
  onClose: () => void
}) {
  const choices = intimacies.filter(protectable)
  return (
    <Frame title="Righteous Lion Spirit" hint="Which Intimacy does it make unbreakable? Major and Defining only." onClose={onClose}>
      {choices.length === 0 ? (
        <p className="text-sm text-stone-400">This character has no Major or Defining Intimacy yet. Add one in the Intimacies panel, then choose it in the charm window.</p>
      ) : (
        <ul className="space-y-1.5">
          {choices.map(i => (
            <li key={i.id}>
              <button onClick={() => onPick(i.id)}
                className="w-full text-left rounded border border-stone-700 hover:border-amber-500 hover:bg-stone-800 px-3 py-2 text-sm text-stone-200 transition-colors">
                <span className="text-[11px] uppercase tracking-wider text-amber-400 mr-2">{i.intensity}</span>
                {i.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button onClick={onClose} className={laterBtn}>Later</button>
      </div>
    </Frame>
  )
}
