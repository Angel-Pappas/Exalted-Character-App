import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Character, CharacterData, GameData } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'
import TabBar from '../components/TabBar'
import SheetTab from '../tabs/SheetTab'
import MilestonesTab from '../tabs/MilestonesTab'
import NotesTab from '../tabs/NotesTab'
import CharactersTab from '../tabs/CharactersTab'

const defaultData: CharacterData = {
  sheet: { attributes: {}, abilities: {}, defenses: {}, defenseOther: false, fullDefense: false, essence: 1, anima: 0, power: 0, will: 0, defenseBonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 }, languages: [], merits: [], intimacies: [], motes: { current: 0, committed: 0, total: 0 }, health: [], layout: [], charms: [], effects: [], inventory: [], foi: { active: false, weight: null, tag: null, artifact: false }, foiOriginals: {}, exaltType: '', caste: '' },
  milestones: [],
  notes: '',
  npcs: [],
}

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [character, setCharacter] = useState<Character | null>(null)
  const [data, setData] = useState<CharacterData>(defaultData)
  const [gameData, setGameData] = useState<GameData>(DEFAULT_GAME_DATA)
  const [activeTab, setActiveTab] = useState('sheet')
  const [sheetEditMode, setSheetEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data: char, error }) => {
        if (error || !char) { navigate('/'); return }
        setCharacter(char)
        setData({ ...defaultData, ...char.data })
      })
  }, [id, navigate])

  useEffect(() => {
    if (!user) return
    supabase
      .from('game_data')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
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
    await supabase.from('characters').update({ data: newData }).eq('id', id)
    setSaving(false)
  }, [id])

  function updateData(partial: Partial<CharacterData>) {
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
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/characters')} className="text-stone-400 hover:text-stone-200 text-sm shrink-0">← Back</button>
          <h1 className="text-amber-400 font-semibold shrink-0">{character.name}</h1>
          {identity && (
            <>
              <span className="w-px h-4 bg-stone-700 shrink-0" />
              <span className="text-sm text-stone-400 truncate">{identity}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-stone-500">Saving…</span>}
          {activeTab === 'sheet' && (
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

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-auto">
        {activeTab === 'sheet' && (
          <SheetTab
            sheet={data.sheet}
            onChange={sheet => updateData({ sheet })}
            editMode={sheetEditMode}
            gameData={gameData}
          />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab
            milestones={data.milestones}
            onChange={milestones => updateData({ milestones })}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            notes={data.notes}
            onChange={notes => updateData({ notes })}
          />
        )}
        {activeTab === 'characters' && (
          <CharactersTab
            npcs={data.npcs}
            onChange={npcs => updateData({ npcs })}
          />
        )}
      </div>
    </div>
  )
}
