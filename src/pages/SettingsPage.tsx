import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
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

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Appearance</h2>
          <div className="flex items-center justify-between">
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
        </section>
      </div>
    </div>
  )
}
