import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

const STATUS_COLOR = {
  connected: 'text-green-400',
  disconnected: 'text-gray-500',
  qr: 'text-yellow-400',
}

const STATUS_LABEL = {
  connected: '● Conectado',
  disconnected: '○ Desconectado',
  qr: '⬡ Aguardando QR',
}

export default function Instances() {
  const [instances, setInstances] = useState([])
  const [qr, setQr] = useState(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const { on } = useWS()

  useEffect(() => {
    api.get('/instances').then(r => setInstances(r.data))
  }, [])

  useEffect(() => {
    return on('instance_status', ({ instanceId, status, qr_code }) => {
      setInstances(list => list.map(i => i.id === instanceId ? { ...i, status } : i))
      if (qr_code) setQr({ instanceId, code: qr_code })
    })
  }, [on])

  async function create(e) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const r = await api.post('/instances', { name })
      setInstances(list => [...list, r.data])
      setName('')
    } finally {
      setCreating(false)
    }
  }

  async function connect(id) {
    const r = await api.get(`/instances/${id}/qr`)
    if (r.data?.code) setQr({ instanceId: id, code: r.data.code })
  }

  async function remove(id) {
    if (!confirm('Desconectar e remover instância?')) return
    await api.delete(`/instances/${id}`)
    setInstances(list => list.filter(i => i.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-6">Conexões WhatsApp</h2>

        {/* Nova instância */}
        <form onSubmit={create} className="flex gap-2 mb-6">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome da instância (ex: Vendas)"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
          />
          <button type="submit" disabled={creating} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
            {creating ? 'Criando...' : '+ Criar'}
          </button>
        </form>

        {/* Lista */}
        <div className="space-y-3">
          {instances.map(inst => (
            <div key={inst.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white">{inst.name}</p>
                <p className={`text-xs mt-0.5 ${STATUS_COLOR[inst.status] || 'text-gray-500'}`}>
                  {STATUS_LABEL[inst.status] || inst.status}
                </p>
                {inst.phone && <p className="text-xs text-gray-600 mt-0.5">{inst.phone}</p>}
              </div>
              <div className="flex gap-2">
                {inst.status !== 'connected' && (
                  <button
                    onClick={() => connect(inst.id)}
                    className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg"
                  >
                    Conectar
                  </button>
                )}
                <button
                  onClick={() => remove(inst.id)}
                  className="text-xs px-3 py-1.5 border border-gray-700 hover:border-red-700 hover:text-red-400 rounded-lg text-gray-400"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
          {instances.length === 0 && (
            <p className="text-center text-gray-600 py-12">Nenhuma instância criada</p>
          )}
        </div>

        {/* QR Modal */}
        {qr && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setQr(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-white mb-4">Escaneie o QR Code</h3>
              <p className="text-xs text-gray-500 mb-4">Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
              <img src={qr.code} alt="QR Code" className="w-56 h-56 mx-auto rounded-xl" />
              <button onClick={() => setQr(null)} className="mt-4 text-xs text-gray-500 hover:text-white">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
