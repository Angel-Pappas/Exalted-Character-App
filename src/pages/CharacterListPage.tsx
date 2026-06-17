import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Character } from '../types/character'


export default function CharacterListPage() {
  const { user, signOut, role } = useAuth()
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<Character[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCharacters(data ?? [])
        setLoading(false)
      })
  }, [])

  async function createCharacter() {
    if (!newName.trim()) return
    const { data } = await supabase
      .from('characters')
      .insert({ name: newName.trim(), user_id: user!.id, data: {} })
      .select()
      .single()
    if (data) navigate(`/character/${data.id}`)
  }

  async function deleteCharacter(id: string) {
    await supabase.from('characters').delete().eq('id', id)
    setCharacters(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <h1 className="text-2xl font-bold text-amber-400">Exalted</h1>
        <div className="flex items-center gap-4">
          <span className="text-stone-400 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={() => navigate('/options')} className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
            Settings
          </button>
          {role === 'admin' && (
            <button onClick={() => navigate('/setup')} className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
              Setup
            </button>
          )}
          <button onClick={signOut} className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="New character name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCharacter()}
            className="flex-1 bg-stone-900 border border-stone-700 text-stone-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
          />
          <button
            onClick={createCharacter}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            Create
          </button>
        </div>

        {loading ? (
          <p className="text-stone-500 text-center text-sm">Loading…</p>
        ) : characters.length === 0 ? (
          <p className="text-stone-500 text-center text-sm">No characters yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {characters.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 group"
              >
                <button
                  onClick={() => navigate(`/character/${c.id}`)}
                  className="text-left flex-1 text-stone-100 hover:text-amber-400 font-medium transition-colors"
                >
                  {c.name}
                </button>
                <button
                  onClick={() => deleteCharacter(c.id)}
                  className="text-stone-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
