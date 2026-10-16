import { useState } from 'react'
import ModalPortal from './ModalPortal'
import type { CharmCost } from '../lib/charmTraining'
import { KIND_LABELS, MILESTONE_USES, parseAmount, type MilestoneType } from '../lib/milestones'

// Asked whenever a charm is added or bought again on the sheet: what paid for
// it. The answer becomes a line in the milestone ledger (usually starting a
// training), so the two never drift apart.

type Choice = MilestoneType | 'creation'

// The milestone types that can buy charms at all (Angel's house table); Major only buys Attributes.
const CHARM_TYPES: MilestoneType[] = ['exalted', 'minor', 'personal']

export default function CharmCostModal({ charmName, repurchase, onConfirm, onClose }: {
  charmName: string
  repurchase: boolean
  onConfirm: (cost: CharmCost) => void
  onClose: () => void
}) {
  // A new charm is usually Exalted; a repurchase or new mode usually Personal.
  const [choice, setChoice] = useState<Choice>(repurchase ? 'personal' : 'exalted')
  const [amount, setAmount] = useState('1')
  const [training, setTraining] = useState(true)

  function confirm() {
    if (choice === 'creation') { onConfirm({ kind: 'creation' }); return }
    const amounts = { personal: 0, exalted: 0, minor: 0, major: 0 }
    amounts[choice] = parseAmount(amount)
    onConfirm({ kind: 'purchase', amounts, training })
  }

  const option = (value: Choice, label: string, hint: string) => (
    <label key={value} data-tip={hint}
      className={`flex-1 cursor-pointer whitespace-nowrap rounded border px-2 py-1.5 text-center text-xs transition-colors ${
        choice === value ? 'border-amber-500 bg-amber-500/15 text-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'}`}>
      <input type="radio" name="charm-cost" value={value} checked={choice === value} onChange={() => setChoice(value)} className="sr-only" />
      {label}
    </label>
  )

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onClose}>
        <form className="w-[28rem] max-w-[95vw] rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl space-y-3"
          onClick={e => e.stopPropagation()}
          onSubmit={e => { e.preventDefault(); confirm() }}>
          <div>
            <h2 className="text-sm font-semibold text-amber-400">{charmName}{repurchase ? ' — repurchase' : ''}</h2>
            <p className="text-xs text-stone-400 mt-0.5">What paid for it? It goes into the Milestones ledger.</p>
          </div>
          <div className="flex gap-1.5">
            {CHARM_TYPES.map(t => option(t, t[0].toUpperCase() + t.slice(1), `${MILESTONE_USES[t].join(' · ')}`))}
            {option('creation', KIND_LABELS.creation, 'Part of the starting build — costs nothing, no training')}
          </div>
          {choice !== 'creation' && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-stone-400">
                Milestones spent
                <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Milestones spent"
                  className="w-14 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500" />
              </label>
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input type="checkbox" checked={training} onChange={e => setTraining(e.target.checked)} className="accent-amber-500" />
                In training
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-200 text-sm px-2">Cancel</button>
            <button type="submit" autoFocus className="bg-amber-600 hover:bg-amber-500 text-white rounded px-4 py-1.5 text-sm transition-colors">
              {repurchase ? 'Buy again' : 'Add charm'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}
