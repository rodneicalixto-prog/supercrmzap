import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'

const nav = [
  { to: '/',            icon: '💬', label: 'Atendimentos' },
  { to: '/queues',      icon: '🎯', label: 'Fila'         },
  { to: '/kanban',      icon: '🗂️', label: 'Kanban'       },
  { to: '/contacts',   icon: '👥', label: 'Contatos'     },
  { to: '/instances',  icon: '📱', label: 'Conexões'     },
  { to: '/schedules',  icon: '📅', label: 'Agenda'       },
  { to: '/dashboard',  icon: '📊', label: 'Dashboard'    },
  { to: '/academy',    icon: '🎓', label: 'Academy'      },
]

const adminNav = [
  { to: '/users',   icon: '🔐', label: 'Usuários' },
  { to: '/logs',    icon: '📋', label: 'Logs' },
  { to: '/tenants', icon: '🏢', label: 'Tenants',  superOnly: true },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { connected } = useWS()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-base font-bold text-white">⚡ SOS Super MKT</h1>
          <p className="text-xs text-gray-500 mt-0.5">WhatsApp Bot</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3 text-xs text-gray-600 uppercase tracking-wider">Admin</div>
              {adminNav.filter(item => !item.superOnly || user?.role === 'super_admin').map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white font-medium'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} title={connected ? 'Conectado' : 'Desconectado'} />
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-red-400 text-left px-1 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
