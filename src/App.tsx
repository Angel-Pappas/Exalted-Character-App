import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CharactersPage from './pages/CharactersPage'
import CharacterPage from './pages/CharacterPage'
import CharacterOptionsPage from './pages/CharacterOptionsPage'
import CampaignsPage from './pages/CampaignsPage'
import CampaignPage from './pages/CampaignPage'
import SettingsPage from './pages/SettingsPage'
import SetupPage from './pages/SetupPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
            <Route path="/character/:id" element={<ProtectedRoute><CharacterPage /></ProtectedRoute>} />
            <Route path="/character/:id/options" element={<ProtectedRoute><CharacterOptionsPage /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
            <Route path="/campaign/:id" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
            <Route path="/options" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
