import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { CampaignSummary } from '../types/campaign'
import ModalPortal from '../components/ModalPortal'

// Every campaign the signed-in user is in. Anyone can start one and becomes
// its Storyteller.
export default function CampaignsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<CampaignSummary[]>('GET', 'campaigns').then(({ data }) => {
      setCampaigns(data ?? [])
      setLoading(false)
    })
  }, [])

  async function createCampaign() {
    if (!newName.trim()) { setError('Give the campaign a name first.'); return }
    setCreating(true)
    const { data, error } = await api<{ id: string }>('POST', 'campaigns', { name: newName.trim() })
    setCreating(false)
    if (error || !data) { setError(error); return }
    navigate(`/campaign/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-xl font-bold text-amber-400">Campaigns</h1>
        </div>
        <button
          onClick={() => { setNewName(''); setError(null); setModalOpen(true) }}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + New Campaign
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-stone-500 text-center text-sm">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-stone-500 text-center text-sm">You're not in any campaign yet. Start one above, or ask a Storyteller to add you.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <button key={c.id} onClick={() => navigate(`/campaign/${c.id}`)}
                className="w-full text-left flex items-center justify-between bg-stone-900 border border-stone-700 hover:border-amber-500 rounded-lg px-4 py-3 transition-colors group">
                <div className="min-w-0">
                  <div className="text-stone-100 group-hover:text-amber-400 font-medium transition-colors">{c.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Storyteller: {c.storyteller.username} · {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                  </div>
                </div>
                {c.is_storyteller && <span className="text-[11px] px-2 py-0.5 rounded border border-amber-600/60 text-amber-400 shrink-0">ST</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalPortal onClose={() => setModalOpen(false)}>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-semibold text-stone-200">New Campaign</h3>
              <div className="space-y-1">
                <label className="text-xs text-stone-400" htmlFor="campaign-name">Name</label>
                <input id="campaign-name" type="text" value={newName} autoFocus placeholder="Dawn of the Reach"
                  onChange={e => { setNewName(e.target.value); setError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') void createCampaign() }}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500" />
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
              <p className="text-xs text-stone-500">You'll be its Storyteller. You can hand that role to another member later.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => void createCampaign()} disabled={creating}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors">
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm rounded transition-colors">
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
