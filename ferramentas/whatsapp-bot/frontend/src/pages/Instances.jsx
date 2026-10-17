import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

const STATUS_COLOR = {
  conectado: 'text-green-400',
  desconectado: 'text-gray-500',
  aguardando_qr: 'text-yellow-400',
  connected: 'text-green-400',
  disconnected: 'text-gray-500',
  qr: 'text-yellow-400',
}

const STATUS_LABEL = {
  conectado: '● Conectado',
  desconectado: '○ Desconectado',
  aguardando_qr: '⬡ Aguardando QR',
  connected: '● Conectado',
  disconnected: '○ Desconectado',
  qr: '⬡ Aguardando QR',
}

const WEBHOOK_FORM_INIT = { n8nWebhookUrl: '', openaiApiKey: '', openaiWebhook: '' }

export default function Instances() {
  const [instances, setInstances] = useState([])
  const [qr, setQr] = useState(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [webhookModal, setWebhookModal] = useState(null) // instância selecionada
  const [webhookForm, setWebhookForm] = useState(WEBHOOK_FORM_INIT)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const { on } = useWS()

  useEffect(() => {
    api.get('/instances').then(r => setInstances(r.data))
  }, [])

  useEffect(() => {
    return on('status_instancia', ({ instanceId, status, qr_code }) => {
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
    try {
      const r = await api.post(`/instances/${id}/connect`)
      const code = r.data?._qr || r.data?.base64 || r.data?.qrcode?.base64 || r.data?.code
      if (code) {
        setQr({ instanceId: id, code: code.startsWith('data:') ? code : `data:image/png;base64,${code}` })
      } else {
        alert('QR Code ainda não disponível. Aguarde alguns segundos e tente novamente.')
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao conectar. Verifique se a Evolution API está acessível.')
    }
  }

  async function disconnect(id) {
    try {
      await api.post(`/instances/${id}/disconnect`)
      setInstances(list => list.map(i => i.id === id ? { ...i, status: 'desconectado' } : i))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao desconectar')
    }
  }

  async function remove(id) {
    if (!confirm('Remover instância e todos os dados?')) return
    await api.delete(`/instances/${id}`)
    setInstances(list => list.filter(i => i.id !== id))
  }

  function abrirWebhooks(inst) {
    setWebhookForm({
      n8nWebhookUrl: inst.n8nWebhookUrl || '',
      openaiApiKey: inst.openaiApiKey || '',
      openaiWebhook: inst.openaiWebhook || '',
    })
    setWebhookModal(inst)
  }

  async function salvarWebhooks(e) {
    e.preventDefault()
    setSavingWebhook(true)
    try {
      const r = await api.put(`/instances/${webhookModal.id}`, webhookForm)
      setInstances(list => list.map(i => i.id === webhookModal.id ? { ...i, ...r.data } : i))
      setWebhookModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSavingWebhook(false)
    }
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
            <div key={inst.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{inst.name}</p>
                  <p className={`text-xs mt-0.5 ${STATUS_COLOR[inst.status] || 'text-gray-500'}`}>
                    {STATUS_LABEL[inst.status] || inst.status}
                  </p>
                  {inst.phone && <p className="text-xs text-gray-600 mt-0.5">{inst.phone}</p>}
                  {/* Indicadores de webhook configurado */}
                  <div className="flex gap-2 mt-1">
                    {inst.n8nWebhookUrl && (
                      <span className="text-xs bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded">n8n ✓</span>
                    )}
                    {inst.openaiWebhook && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">OpenAI ✓</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => abrirWebhooks(inst)}
                    className="text-xs px-3 py-1.5 border border-gray-700 hover:border-blue-600 hover:text-blue-400 rounded-lg text-gray-400"
                    title="Configurar webhooks n8n e OpenAI"
                  >
                    ⚙ Webhooks
                  </button>
                  {(inst.status === 'conectado' || inst.status === 'connected') ? (
                    <button
                      onClick={() => disconnect(inst.id)}
                      className="text-xs px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-white"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(inst.id)}
                      className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-white"
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

        {/* Modal Webhooks */}
        {webhookModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setWebhookModal(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-white mb-1">Webhooks — {webhookModal.name}</h3>
              <p className="text-xs text-gray-500 mb-4">Cada mensagem recebida nesta instância será enviada para os endpoints configurados abaixo.</p>
              <form onSubmit={salvarWebhooks} className="space-y-4">
                {/* n8n */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🔶 Webhook n8n</label>
                  <input
                    type="url"
                    value={webhookForm.n8nWebhookUrl}
                    onChange={e => setWebhookForm(f => ({ ...f, n8nWebhookUrl: e.target.value }))}
                    placeholder="https://seu-n8n.com/webhook/abc123"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Recebe o payload completo da Evolution API (todas as mensagens)</p>
                </div>

                {/* OpenAI Webhook */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🤖 Webhook OpenAI / Agente IA</label>
                  <input
                    type="url"
                    value={webhookForm.openaiWebhook}
                    onChange={e => setWebhookForm(f => ({ ...f, openaiWebhook: e.target.value }))}
                    placeholder="https://seu-agente.com/webhook"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Recebe: phone, name, message, conversationId, instanceName</p>
                </div>

                {/* OpenAI API Key */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🔑 Chave OpenAI (opcional)</label>
                  <input
                    type="password"
                    value={webhookForm.openaiApiKey}
                    onChange={e => setWebhookForm(f => ({ ...f, openaiApiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Enviada no campo <code>apiKey</code> do payload para o webhook acima</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={savingWebhook} className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium">
                    {savingWebhook ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => setWebhookModal(null)} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
