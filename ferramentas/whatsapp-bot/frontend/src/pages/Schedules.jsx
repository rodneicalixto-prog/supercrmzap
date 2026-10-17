import { useEffect, useState } from 'react'
import { api } from '../services/api'

const STATUS_COLOR = {
  pending: 'bg-yellow-900 text-yellow-300',
  sent: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
}

const STATUS_LABEL = {
  pending: 'Agendado',
  sent: 'Enviado',
  failed: 'Falhou',
}

export default function Schedules() {
  const [schedules, setSchedules] = useState([])
  const [instances, setInstances] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ instanceId: '', phone: '', message: '', scheduledAt: '' })
  const [loading, setLoading] = useState(false)
  const [anexo, setAnexo] = useState(null) // { url, filename, mimetype }
  const [uploadando, setUploadando] = useState(false)

  useEffect(() => {
    load()
    api.get('/instances').then(r => setInstances(r.data))
  }, [])

  async function load() {
    const r = await api.get('/schedules')
    setSchedules(r.data)
  }

  function openNew() {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    setForm({ instanceId: '', phone: '', message: '', scheduledAt: now.toISOString().slice(0, 16) })
    setAnexo(null)
    setModal(true)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAnexo(r.data)
    } catch {
      alert('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploadando(false)
    }
  }

  function mediaTypeFromMime(mime) {
    if (!mime) return 'document'
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    return 'document'
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      if (anexo) {
        payload.mediaUrl = anexo.url
        payload.mediaType = mediaTypeFromMime(anexo.mimetype)
      }
      await api.post('/schedules', payload)
      setModal(false)
      load()
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    if (!confirm('Cancelar agendamento?')) return
    await api.delete(`/schedules/${id}`)
    load()
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Agenda de Mensagens</h2>
        <button onClick={openNew} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg">
          + Agendar mensagem
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status] || 'bg-gray-800 text-gray-400'}`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(s.scheduledAt)}</span>
                </div>
                <p className="text-sm font-medium text-white">{s.phone}</p>
                <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{s.message}</p>
                {s.mediaUrl && (
                  <p className="text-xs text-blue-400 mt-0.5">📎 Anexo: {s.mediaType}</p>
                )}
              </div>
              {s.status === 'pending' && (
                <button onClick={() => remove(s.id)} className="text-xs text-gray-500 hover:text-red-400 whitespace-nowrap">
                  Cancelar
                </button>
              )}
            </div>
          ))}
          {schedules.length === 0 && (
            <div className="text-center text-gray-600 py-16">Nenhuma mensagem agendada</div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-4">Agendar mensagem</h3>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Instância</label>
                <select
                  required
                  value={form.instanceId}
                  onChange={e => setForm(p => ({ ...p, instanceId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione...</option>
                  {instances.filter(i => i.status === 'conectado').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                <input
                  required
                  placeholder="5511999999999"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data e hora</label>
                <input
                  required
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mensagem {anexo ? '(legenda do anexo — opcional)' : ''}</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  placeholder={anexo ? 'Legenda opcional...' : 'Digite a mensagem...'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Anexo (foto, vídeo, documento)</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="px-3 py-2 bg-gray-800 border border-gray-700 hover:border-green-500 rounded-lg text-xs text-gray-300">
                    {uploadando ? 'Enviando...' : '📎 Selecionar arquivo'}
                  </span>
                  <input type="file" className="hidden" onChange={handleFile} disabled={uploadando}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
                  {anexo && (
                    <span className="text-xs text-green-400 truncate max-w-[160px]">✓ {anexo.filename}</span>
                  )}
                </label>
                {anexo && (
                  <button type="button" onClick={() => setAnexo(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">
                    Remover anexo
                  </button>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
                  {loading ? 'Agendando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
