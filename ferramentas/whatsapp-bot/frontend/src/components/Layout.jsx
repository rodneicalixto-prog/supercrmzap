import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { useNotifications } from '../hooks/useNotifications'

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
  const { notificacoes, naoLidas, piscando, somAtivo, toggleSom, limparNaoLidas, limparTodas } = useNotifications()
  const [painelAberto, setPainelAberto] = useState(false)
  const painelRef = useRef(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function togglePainel() {
    if (!painelAberto) limparNaoLidas()
    setPainelAberto(v => !v)
  }

  function abrirConversa(conversationId) {
    setPainelAberto(false)
    navigate('/', { state: { conversaId: conversationId } })
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo + Campainha */}
        <div className="p-4 border-b border-gray-800 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-white">⚡ SOS Super MKT</h1>
            <p className="text-xs text-gray-500 mt-0.5">WhatsApp Bot</p>
          </div>
          {/* Campainha */}
          <div className="relative">
            <button
              onClick={togglePainel}
              className={`relative p-1.5 rounded-lg transition-colors ${painelAberto ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              title="Notificações"
            >
              <span className={`text-lg leading-none ${naoLidas > 0 ? 'animate-bounce' : ''}`}>🔔</span>
              {naoLidas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {naoLidas > 99 ? '99+' : naoLidas}
                </span>
              )}
            </button>

            {/* Painel de notificações */}
            {painelAberto && (
              <div
                ref={painelRef}
                className="absolute left-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-white">Notificações</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSom}
                      title={somAtivo ? 'Desativar som' : 'Ativar som'}
                      className={`text-sm px-2 py-0.5 rounded-md border transition-colors ${somAtivo ? 'border-green-700 text-green-400 hover:bg-green-900' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                    >
                      {somAtivo ? '🔊' : '🔇'}
                    </button>
                    {notificacoes.length > 0 && (
                      <button onClick={limparTodas} className="text-xs text-gray-500 hover:text-red-400">
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificacoes.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-8">Nenhuma notificação</p>
                  ) : (
                    notificacoes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => abrirConversa(n.conversationId)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-medium text-white truncate">{n.nome}</p>
                          <span className="text-xs text-gray-500 flex-shrink-0">{n.hora}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{n.texto}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
      <main className="flex-1 overflow-hidden relative" onClick={() => painelAberto && setPainelAberto(false)}>
        {children}
        {/* Sinalizador visual — borda piscante sobre o conteúdo */}
        {piscando && (
          <div className="pointer-events-none absolute inset-0 z-40 animate-pulse"
            style={{ boxShadow: 'inset 0 0 0 4px #22c55e, inset 0 0 40px 8px rgba(34,197,94,0.25)' }} />
        )}
      </main>
    </div>
  )
}
