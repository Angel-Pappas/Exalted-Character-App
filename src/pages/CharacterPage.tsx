import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Character, CharacterData } from '../types/character'
import TabBar from '../components/TabBar'
import SheetTab from '../tabs/SheetTab'
import MilestonesTab from '../tabs/MilestonesTab'
import NotesTab from '../tabs/NotesTab'
import CharactersTab from '../tabs/CharactersTab'

const defaultData: CharacterData = {
  sheet: {},
  milestones: [],
  notes: '',
  npcs: [],
}

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [character, setCharacter] = useState<Character | null>(null)
  const [data, setData] = useState<CharacterData>(defaultData)
  const [activeTab, setActiveTab] = useState('sheet')
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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-amber-400 font-semibold">{character.name}</h1>
        </div>
        <span className="text-xs text-stone-500">{saving ? 'Saving…' : 'Saved'}</span>
      </header>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-auto">
        {activeTab === 'sheet' && <SheetTab />}
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
