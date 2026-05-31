import { useEffect, useState } from 'react'
import { api } from '../services/api'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filtroAcao, setFiltroAcao] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    try {
      const params = { page, limit: 50 }
      if (busca) params.action = busca
      const r = await api.get('/logs', { params })
      setLogs(r.data.data)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } finally {
      setLoading(false)
    }
  }

  function handleBusca(e) {
    e.preventDefault()
    setPage(1)
    load()
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleString('pt-BR')
  }

  function corAcao(action) {
    if (action.includes('login')) return 'text-green-400'
    if (action.includes('erro') || action.includes('falha')) return 'text-red-400'
    if (action.includes('remov') || action.includes('delet')) return 'text-red-400'
    if (action.includes('cri') || action.includes('novo')) return 'text-blue-400'
    return 'text-gray-300'
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Logs de Auditoria</h2>
          <p className="text-xs text-gray-500 mt-0.5">{total} registro{total !== 1 ? 's' : ''}</p>
        </div>
        <form onSubmit={handleBusca} className="flex gap-2">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Filtrar por ação..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 w-52"
          />
          <button type="submit" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white">
            Buscar
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-center text-gray-500 py-8 text-sm">Carregando...</div>}
        {!loading && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatarData(log.createdAt)}</td>
                  <td className={`px-4 py-2.5 font-medium text-xs ${corAcao(log.action)}`}>{log.action}</td>
                  <td className="px-4 py-2.5 text-gray-300 text-xs">
                    {log.user ? (
                      <span title={log.user.email}>{log.user.name}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{log.tenant?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{log.ip || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && (
          <div className="text-center text-gray-600 py-16">Nenhum log registrado</div>
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
