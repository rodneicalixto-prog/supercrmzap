import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WSProvider } from './contexts/WSContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Conversations from './pages/Conversations'
import Kanban from './pages/Kanban'
import Contacts from './pages/Contacts'
import Instances from './pages/Instances'
import Schedules from './pages/Schedules'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Carregando...</div>
  if (!user) return <Navigate to="/login" />
  if (adminOnly && user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to="/" />
  return <Layout>{children}</Layout>
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
            <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
            <Route path="/instances" element={<PrivateRoute><Instances /></PrivateRoute>} />
            <Route path="/schedules" element={<PrivateRoute><Schedules /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </WSProvider>
    </AuthProvider>
  )
}
