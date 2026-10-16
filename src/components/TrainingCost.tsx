import { MILESTONE_TYPES, type MilestoneAmounts } from '../lib/milestones'

/** What a training cost, e.g. "4 Exalted, 1 Minor" — shown in both training lists. */
export function TrainingCost({ entry }: { entry: MilestoneAmounts }) {
  const parts = MILESTONE_TYPES.filter(t => entry[t] > 0)
  if (parts.length === 0) return <span className="text-stone-600">free</span>
  return (
    <span className="whitespace-nowrap">
      {parts.map((t, i) => (
        <span key={t}>{i > 0 && ', '}{entry[t]} <span className="capitalize">{t}</span></span>
      ))}
    </span>
  )
}
