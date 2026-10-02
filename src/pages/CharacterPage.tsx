import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { canEditCharacter } from '../lib/characterAccess'
import type { Character, CharacterData, GameData } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'
import TabBar from '../components/TabBar'
import SheetTab from '../tabs/SheetTab'
import MilestonesTab from '../tabs/MilestonesTab'
import NotesTab from '../tabs/NotesTab'
import CircleTab from '../tabs/CircleTab'

const defaultData: CharacterData = {
  sheet: { attributes: {}, abilities: {}, defenses: {}, defenseOther: false, fullDefense: false, essence: 1, anima: 0, power: 0, will: 0, defenseBonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 }, languages: [], merits: [], intimacies: [], motes: { current: 0, committed: 0, total: 0 }, damage: 0, layout: [], charms: [], charmGroups: [], effects: [], inventory: [], foi: { active: false, weight: null, tag: null, artifact: false }, foiOriginals: {}, exaltType: '', caste: '' },
  milestones: [],
  notes: '',
  npcs: [],
}

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [character, setCharacter] = useState<Character | null>(null)
  const [data, setData] = useState<CharacterData>(defaultData)
  const [gameData, setGameData] = useState<GameData>(DEFAULT_GAME_DATA)
  const [activeTab, setActiveTab] = useState('sheet')
  const [sheetEditMode, setSheetEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    api<Character>('GET', `characters/${id}`)
      .then(({ data: char, error }) => {
        if (error || !char) { navigate('/'); return }
        setCharacter(char)
        setData({ ...defaultData, ...char.data })
      })
  }, [id, navigate])

  useEffect(() => {
    if (!user) return
    api<{ data: Partial<GameData> | null }>('GET', 'game-data')
      .then(({ data: row }) => {
        if (row?.data) {
          setGameData({
            weapons:      row.data.weapons      ?? DEFAULT_GAME_DATA.weapons,
            armor:        row.data.armor        ?? DEFAULT_GAME_DATA.armor,
            tagGroups:    row.data.tagGroups    ?? DEFAULT_GAME_DATA.tagGroups,
            essenceMotes: row.data.essenceMotes ?? DEFAULT_GAME_DATA.essenceMotes,
            animaStates:  row.data.animaStates  ?? DEFAULT_GAME_DATA.animaStates,
          })
        }
      })
  }, [user])

  const save = useCallback(async (newData: CharacterData) => {
    if (!id) return
    setSaving(true)
    await api('PUT', `characters/${id}`, { data: newData })
    setSaving(false)
  }, [id])

  // Someone else's character (a Storyteller's view, or a public one in a shared
  // campaign) is shown read-only: only the sheet, nothing clickable, never saved.
  const readOnly = character !== null && !canEditCharacter(character, user?.id, role)

  function updateData(partial: Partial<CharacterData>) {
    if (readOnly) { setData(prev => ({ ...prev, ...partial })); return }
    setData(prev => {
      const next = { ...prev, ...partial }
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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* One row: who this is, the tabs, then the page's own actions. */}
      <header className="flex items-stretch gap-6 px-4 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0 py-3">
          <button onClick={() => navigate('/characters')} className="text-stone-400 hover:text-stone-200 text-sm shrink-0">← Back</button>
          <h1 className="text-amber-400 font-semibold shrink-0">{character.name}</h1>
          {identity && (
            <>
              <span className="w-px h-4 bg-stone-700 shrink-0" />
              <span className="text-sm text-stone-400 truncate">{identity}</span>
            </>
          )}
        </div>
        <span className="w-px h-5 bg-stone-700 self-center shrink-0" />
        <TabBar active={readOnly ? 'sheet' : activeTab} onChange={setActiveTab} only={readOnly ? ['sheet'] : undefined} />
        <div className="flex items-center gap-3 ml-auto py-3">
          {saving && <span className="text-xs text-stone-500">Saving…</span>}
          {readOnly && <span className="text-xs px-2 py-1 rounded border border-stone-600 text-stone-400">View only</span>}
          {!readOnly && (
            <button onClick={() => navigate(`/character/${character.id}/options`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-600 transition-colors">
              ⚙ Options
            </button>
          )}
          {activeTab === 'sheet' && !readOnly && (
            <button
              onClick={() => setSheetEditMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                sheetEditMode
                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {sheetEditMode ? 'Done' : 'Edit Layout'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {(activeTab === 'sheet' || readOnly) && (
          // A disabled fieldset switches off every input and button inside the sheet at once.
          <fieldset disabled={readOnly} className="contents">
            <SheetTab
              sheet={data.sheet}
              onChange={sheet => updateData({ sheet })}
              editMode={sheetEditMode && !readOnly}
              readOnly={readOnly}
              gameData={gameData}
            />
          </fieldset>
        )}
        {!readOnly && activeTab === 'milestones' && (
          <MilestonesTab
            milestones={data.milestones}
            onChange={milestones => updateData({ milestones })}
          />
        )}
        {!readOnly && activeTab === 'notes' && (
          <NotesTab
            notes={data.notes}
            onChange={notes => updateData({ notes })}
          />
        )}
        {!readOnly && activeTab === 'circle' && <CircleTab characterId={character.id} />}
      </div>
    </div>
  )
}
