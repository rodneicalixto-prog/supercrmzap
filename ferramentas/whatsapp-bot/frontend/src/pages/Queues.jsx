import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Queues() {
  const [fila, setFila] = useState([])
  const [stats, setStats] = useState({ naFila: 0, emAtendimento: 0, encerradas: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    load()
    loadStats()
  }, [page])

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/queues', { params: { page, limit: 30 } })
      setFila(r.data.data)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    const r = await api.get('/queues/stats')
    setStats(r.data)
  }

  async function assumir(id) {
    try {
      await api.patch(`/queues/${id}/assumir`)
      load()
      loadStats()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao assumir atendimento')
    }
  }

  function tempoEspera(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60)
    return `${h}h ${min % 60}m`
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">Fila de Atendimento</h2>
        <p className="text-xs text-gray-500 mt-0.5">{total} aguardando</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.naFila}</p>
          <p className="text-xs text-gray-500 mt-1">Na fila</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.emAtendimento}</p>
          <p className="text-xs text-gray-500 mt-1">Em atendimento</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.encerradas}</p>
          <p className="text-xs text-gray-500 mt-1">Encerradas hoje</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading && <div className="text-center text-gray-500 py-8 text-sm">Carregando...</div>}
        {!loading && fila.map((conv, idx) => (
          <div key={conv.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-yellow-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {conv.contact?.name || conv.contact?.phone || 'Desconhecido'}
                </p>
                <span className="text-xs text-gray-500 flex-shrink-0">via {conv.instance?.name}</span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {conv.messages?.[0]?.body || 'Sem mensagens'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-yellow-500 font-medium">{tempoEspera(conv.updatedAt)}</p>
              <p className="text-xs text-gray-600">esperando</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => assumir(conv.id)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium text-white"
              >
                Assumir
              </button>
              <button
                onClick={() => navigate('/', { state: { conversaId: conv.id } })}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white"
              >
                Ver
              </button>
            </div>
          </div>
        ))}
        {!loading && fila.length === 0 && (
          <div className="text-center text-gray-600 py-16">
            <p className="text-4xl mb-3">✅</p>
            <p>Nenhuma conversa na fila</p>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="p-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded bg-gray-800 disabled:opacity-30 hover:bg-gray-700">Anterior</button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded bg-gray-800 disabled:opacity-30 hover:bg-gray-700">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}
