import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function KpiCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left w-full hover:border-gray-600 transition-colors ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color || 'text-white'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/conversations?status=open'),
      api.get('/conversations?status=pending'),
      api.get('/conversations?status=resolved'),
      api.get('/contacts'),
      api.get('/instances'),
    ]).then(([open, pending, resolved, contacts, instances]) => {
      setStats({
        open: open.data.length,
        pending: pending.data.length,
        resolved: resolved.data.length,
        contacts: contacts.data.length,
        instances: instances.data.length,
        connected: instances.data.filter(i => i.status === 'connected').length,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <KpiCard
            label="Em atendimento"
            value={stats?.open}
            color="text-green-400"
            sub="conversas abertas"
            onClick={() => navigate('/?status=open')}
          />
          <KpiCard
            label="Aguardando"
            value={stats?.pending}
            color="text-yellow-400"
            sub="na fila"
            onClick={() => navigate('/?status=pending')}
          />
          <KpiCard
            label="Resolvidos hoje"
            value={stats?.resolved}
            color="text-gray-300"
            sub="finalizados"
          />
          <KpiCard
            label="Contatos"
            value={stats?.contacts}
            sub="na base CRM"
            onClick={() => navigate('/contacts')}
          />
          <KpiCard
            label="Instâncias"
            value={stats?.instances}
            sub={`${stats?.connected ?? 0} conectadas`}
            color="text-blue-400"
            onClick={() => navigate('/instances')}
          />
          <KpiCard
            label="Status"
            value={stats?.connected > 0 ? '✅' : '⚠️'}
            sub={stats?.connected > 0 ? 'WhatsApp online' : 'Nenhuma conexão ativa'}
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Acesso rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Nova conversa', icon: '💬', to: '/' },
              { label: 'Ver Kanban', icon: '🗂️', to: '/kanban' },
              { label: 'Contatos', icon: '👥', to: '/contacts' },
              { label: 'Agenda', icon: '📅', to: '/schedules' },
            ].map(item => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-3 text-sm text-gray-300 transition-colors"
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
