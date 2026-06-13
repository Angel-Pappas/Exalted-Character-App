import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import CharacterListPage from './pages/CharacterListPage'
import CharacterPage from './pages/CharacterPage'
import OptionsPage from './pages/OptionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><CharacterListPage /></ProtectedRoute>} />
          <Route path="/character/:id" element={<ProtectedRoute><CharacterPage /></ProtectedRoute>} />
          <Route path="/options" element={<ProtectedRoute><OptionsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
