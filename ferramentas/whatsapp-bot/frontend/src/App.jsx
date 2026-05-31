import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WSProvider } from './contexts/WSContext'
import Login from './pages/Login'
import Conversations from './pages/Conversations'
import Kanban from './pages/Kanban'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Carregando...</div>
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <WSProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Conversations /></PrivateRoute>} />
            <Route path="/kanban" element={<PrivateRoute><Kanban /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </WSProvider>
    </AuthProvider>
  )
}
