import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useCharacter, useGameData } from '../hooks/useCharacter'
import { useAuth } from '../contexts/AuthContext'
import { canEditCharacter } from '../lib/characterAccess'
import type { CharacterData, TrainingDone } from '../types/character'
import { todayKey } from '../lib/milestones'
import { applyChange, type CharacterChange } from '../lib/characterData'
import TabBar from '../components/TabBar'
import PageHeader from '../components/PageHeader'
import { tabFromPath } from '../lib/characterTabs'
import SheetTab from '../tabs/SheetTab'
import MilestonesTab from '../tabs/MilestonesTab'
import NotesTab from '../tabs/NotesTab'
import CircleTab from '../tabs/CircleTab'

export default function CharacterPage() {
  const { id, tab } = useParams<{ id: string; tab?: string }>()
  const { user, role } = useAuth()
  const { character, data, setData } = useCharacter(id)
  const gameData = useGameData()
  const activeTab = tabFromPath(tab)
  const [sheetEditMode, setSheetEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  // Which trainings are done. Kept on the server outside the sheet, so the
  // Storyteller can mark them too; both tabs read it.
  const [trainingDone, setTrainingDoneMap] = useState<TrainingDone>({})
  const [trainingError, setTrainingError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api<TrainingDone>('GET', `characters/${id}/training`).then(({ data }) => setTrainingDoneMap(data ?? {}))
  }, [id])

  // The latest data not yet sent, so flushSave can send it at once.
  const pending = useRef<CharacterData | null>(null)

  const save = useCallback(async (newData: CharacterData) => {
    if (!id) return
    if (pending.current === newData) pending.current = null
    setSaving(true)
    await api('PUT', `characters/${id}`, { data: newData })
    setSaving(false)
  }, [id])

  // Sends a waiting save now. Marking a training done needs the server to
  // have the ledger line that was perhaps logged a moment ago.
  async function flushSave() {
    if (!pending.current) return
    if (saveTimeout) clearTimeout(saveTimeout)
    await save(pending.current)
  }

  // Closing or reloading the browser tab within the second before a save goes out
  // would lose that change: the save is sent at once, and the browser asks
  // "Leave site?" so it has time to arrive.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!pending.current) return
      void save(pending.current)
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [save])

  // Marks a training done (or back in training). The sheet is saved first, so the
  // server has the ledger line, which may have been logged a moment ago.
  async function setTrainingDone(lineId: string, finished: boolean) {
    setTrainingError(null)
    await flushSave()
    const { error } = await api(finished ? 'PUT' : 'DELETE', `characters/${id}/training/${lineId}`)
    if (error) { setTrainingError(error); return }
    setTrainingDoneMap(prev => {
      const next = { ...prev }
      if (finished) next[lineId] = todayKey()
      else delete next[lineId]
      return next
    })
  }

  // Someone else's character (a Storyteller's view, or a public one in a shared
  // campaign) is shown read-only: only the sheet, nothing clickable, never saved.
  const readOnly = character !== null && !canEditCharacter(character, user?.id, role)

  // Each change carries only what it touched, merged onto the latest data (see applyChange).
  function updateData(change: CharacterChange) {
    if (readOnly) { setData(prev => applyChange(prev, change)); return }
    setData(prev => {
      const next = applyChange(prev, change)
      pending.current = next
      if (saveTimeout) clearTimeout(saveTimeout)
      setSaveTimeout(setTimeout(() => save(next), 1000))
      return next
    })
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <span className="text-amber-400 text-sm">Loading…</span>
      </div>
    )
  }

  const identity = [data.sheet.exaltType, data.sheet.caste].filter(Boolean).join(' · ')
  // Someone else's character is reached through a campaign, not your own list.
  const parent = readOnly ? { label: 'Campaigns', to: '/campaigns' } : { label: 'Characters', to: '/characters' }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* One row: who this is, the tabs, then the page's own actions. It stays on
          screen while the page scrolls; on a phone the tabs get a row of their own. */}
      <PageHeader crumbs={[parent]} title={character.name} subtitle={identity}>
        <div className="order-last md:order-none w-full md:w-auto h-10 md:h-auto flex md:border-l md:border-stone-700 md:pl-3 -mx-1.5 md:mx-0">
          <TabBar characterId={character.id} active={readOnly ? 'sheet' : activeTab} only={readOnly ? ['sheet'] : undefined} />
        </div>
        <div className="flex items-center gap-3 ml-auto py-2.5">
          {trainingError && <span className="text-xs text-red-400">{trainingError}</span>}
          {saving && <span className="text-xs text-stone-500" role="status">Saving…</span>}
          {readOnly && <span className="text-xs px-2 py-1 rounded border border-stone-600 text-stone-400">View only</span>}
          {!readOnly && (
            <Link to={`/character/${character.id}/options`} aria-label="Character options"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-600 transition-colors">
              <span aria-hidden>⚙</span><span className="hidden sm:inline">Options</span>
            </Link>
          )}
          {/* Phones show the sheet in one column, so there is no layout to edit there. */}
          {activeTab === 'sheet' && !readOnly && (
            <button
              onClick={() => setSheetEditMode(v => !v)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                sheetEditMode
                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                  : 'bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {sheetEditMode ? 'Done' : 'Edit Layout'}
            </button>
          )}
        </div>
      </PageHeader>

      <main className="flex-1">
        {(activeTab === 'sheet' || readOnly) && (
          // A disabled fieldset switches off every input and button inside the sheet at once.
          <fieldset disabled={readOnly} className="contents">
            <SheetTab
              sheet={data.sheet}
              onChange={sheet => updateData({ sheet })}
              editMode={sheetEditMode && !readOnly}
              readOnly={readOnly}
              gameData={gameData}
              milestones={data.milestones}
              trainingDone={trainingDone}
              onLedgerChange={(sheet, milestones) => updateData({ sheet, milestones })}
              onTrainingDone={lineId => void setTrainingDone(lineId, true)}
            />
          </fieldset>
        )}
        {!readOnly && activeTab === 'milestones' && (
          <MilestonesTab
            milestones={data.milestones}
            sheet={data.sheet}
            trainingDone={trainingDone}
            onChange={(milestones, sheet) => updateData({ milestones, sheet })}
            onTrainingDone={(lineId, finished) => void setTrainingDone(lineId, finished)}
          />
        )}
        {!readOnly && activeTab === 'notes' && (
          <NotesTab
            notes={data.notes}
            onChange={notes => updateData({ notes })}
          />
        )}
        {!readOnly && activeTab === 'circle' && <CircleTab characterId={character.id} />}
      </main>
    </div>
  )
}
