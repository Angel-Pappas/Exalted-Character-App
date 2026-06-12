interface Tab {
  id: string
  label: string
}

const TABS: Tab[] = [
  { id: 'sheet', label: 'Character Sheet' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'notes', label: 'Notes' },
  { id: 'characters', label: 'Characters' },
]

interface TabBarProps {
  active: string
  onChange: (id: string) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-stone-700">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
