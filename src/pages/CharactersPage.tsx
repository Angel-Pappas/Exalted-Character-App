import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Character, ExaltType } from '../types/character'
import ModalPortal from '../components/ModalPortal'

export default function CharactersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  // Creation modal
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExaltType, setNewExaltType] = useState('')
  const [newCaste, setNewCaste] = useState('')
  const [creating, setCreating] = useState(false)
  const [exaltTypes, setExaltTypes] = useState<ExaltType[]>([])

  // Keyed on the id rather than the user object: Supabase hands back a fresh object
  // on every token refresh, which would refetch the list for no reason.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCharacters(data ?? [])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    supabase.from('exalt_types').select('*').order('sort_order').order('name')
      .then(({ data: rows }) => {
        if (rows) setExaltTypes(rows.map(r => ({
          id: r.id, name: r.name, casteLabel: r.caste_label as 'Caste' | 'Aspect',
          castes: r.castes ?? [], sort_order: r.sort_order,
        })))
      })
  }, [])

  const selectedExalt = exaltTypes.find(e => e.name === newExaltType) ?? null
  const casteLabel = selectedExalt?.casteLabel ?? 'Caste'
  const castes = selectedExalt?.castes ?? []

  function openModal() {
    setNewName(''); setNewExaltType(''); setNewCaste('')
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false) }

  async function createCharacter() {
    if (!newName.trim()) return
    setCreating(true)
    const initialSheet = {
      exaltType: newExaltType,
      caste: newCaste,
    }
    const { data } = await supabase
      .from('characters')
      .insert({ name: newName.trim(), user_id: user!.id, data: { sheet: initialSheet } })
      .select()
      .single()
    setCreating(false)
    if (data) navigate(`/character/${data.id}`)
  }

  async function deleteCharacter(id: string) {
    await supabase.from('characters').delete().eq('id', id)
    setCharacters(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-xl font-bold text-amber-400">Characters</h1>
        </div>
        <button
          onClick={openModal}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + New Character
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-stone-500 text-center text-sm">Loading…</p>
        ) : characters.length === 0 ? (
          <p className="text-stone-500 text-center text-sm">No characters yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {characters.map(c => {
              const exaltType = c.data?.sheet?.exaltType as string | undefined
              const caste = c.data?.sheet?.caste as string | undefined
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 group"
                >
                  <button
                    onClick={() => navigate(`/character/${c.id}`)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="text-stone-100 hover:text-amber-400 font-medium transition-colors">{c.name}</div>
                    {(exaltType || caste) && (
                      <div className="text-xs text-stone-500 mt-0.5">
                        {[exaltType, caste].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => deleteCharacter(c.id)}
                    className="text-stone-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-all ml-4 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <ModalPortal onClose={closeModal}>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-stone-200">New Character</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Character name…"
                  autoFocus
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400">Exalt Type</label>
                <select
                  value={newExaltType}
                  onChange={e => { setNewExaltType(e.target.value); setNewCaste('') }}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">— Select —</option>
                  {exaltTypes.map(et => <option key={et.id} value={et.name}>{et.name}</option>)}
                </select>
              </div>

              {newExaltType && (
                <div className="space-y-1">
                  <label className="text-xs text-stone-400">{casteLabel}</label>
                  {castes.length > 0 ? (
                    <select
                      value={newCaste}
                      onChange={e => setNewCaste(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                    >
                      <option value="">— Select —</option>
                      {castes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newCaste}
                      onChange={e => setNewCaste(e.target.value)}
                      placeholder={`Custom ${casteLabel.toLowerCase()}…`}
                      className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={createCharacter}
                disabled={creating || !newName.trim() || !newExaltType || !newCaste}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}
