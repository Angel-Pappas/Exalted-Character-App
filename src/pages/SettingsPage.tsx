import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const SECTIONS = ['Account', 'Appearance'] as const
type Section = typeof SECTIONS[number]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [active, setActive] = useState<Section>('Account')

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-amber-400 font-semibold">Settings</h1>
        </div>
        {role === 'admin' && (
          <button onClick={() => navigate('/setup')} className="text-xs text-stone-400 hover:text-stone-200 transition-colors">
            Setup
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 border-r border-stone-700 py-4 px-2 space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                active === s
                  ? 'bg-stone-800 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6 max-w-xl">
          {active === 'Account' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-stone-200">Account</h2>
              <div className="bg-stone-900 border border-stone-700 rounded-lg divide-y divide-stone-700">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Email</span>
                  <span className="text-sm text-stone-300">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Role</span>
                  <span className="text-sm text-stone-300 capitalize">{role ?? '—'}</span>
                </div>
              </div>
            </div>
          )}

          {active === 'Appearance' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-stone-200">Appearance</h2>
              <div className="bg-stone-900 border border-stone-700 rounded-lg">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Theme</span>
                  <div className="flex gap-1">
                    {(['light', 'dark'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          theme === t
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
