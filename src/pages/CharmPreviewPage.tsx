import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useCharacter, useGameData } from '../hooks/useCharacter'
import { isCharmView } from '../lib/charmView'
import type { CharmView } from '../lib/charmView'
import type { SheetData } from '../types/character'
import SheetTab from '../tabs/SheetTab'

// Temporary: a copy of a character's sheet for trying the candidate Charms panel
// layouts side by side with real data and the real screen width. Everything works
// as on the sheet, but nothing here is ever saved — a refresh brings back the real
// character. The chosen layout lives in the URL (?layout=…), so a refresh keeps it.
// Goes away once Angel has picked a layout.
const LAYOUTS: { view: CharmView; label: string }[] = [
  { view: 'boxes', label: 'Today' },
  { view: 'click', label: 'A · Click to open' },
  { view: 'hover', label: 'B · Hover' },
  { view: 'open', label: 'C · Always open' },
]

export default function CharmPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { character, data, setData } = useCharacter(id)
  const gameData = useGameData()
  const requested = params.get('layout')
  const view: CharmView = isCharmView(requested) ? requested : 'click'

  if (!character) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <span className="text-amber-400 text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-stone-700 shrink-0">
        <button onClick={() => navigate(`/character/${character.id}`)} className="text-stone-400 hover:text-stone-200 text-sm shrink-0">← Back</button>
        <h1 className="text-amber-400 font-semibold shrink-0">{character.name}</h1>
        <span className="w-px h-4 bg-stone-700 shrink-0" />
        <span className="text-sm text-stone-400 shrink-0">Charm layout preview</span>
        <div className="flex rounded border border-stone-600 overflow-hidden">
          {LAYOUTS.map(l => (
            <button key={l.view} onClick={() => setParams({ layout: l.view }, { replace: true })}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                view === l.view ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs px-2 py-1 rounded border border-stone-600 text-stone-400">Nothing here is saved</span>
      </header>

      <div className="flex-1 overflow-auto">
        <SheetTab
          sheet={data.sheet}
          onChange={(sheet: SheetData) => setData(prev => ({ ...prev, sheet }))}
          editMode={false}
          gameData={gameData}
          charmView={view}
        />
      </div>
    </div>
  )
}
