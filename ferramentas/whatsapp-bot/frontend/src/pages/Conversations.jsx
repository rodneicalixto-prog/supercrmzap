import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

const ABAS = [
  { key: 'open',     label: 'Em atendimento', cor: 'text-green-400',  badge: 'bg-green-900 text-green-400' },
  { key: 'pending',  label: 'Aguardando',     cor: 'text-yellow-400', badge: 'bg-yellow-900 text-yellow-400' },
  { key: 'resolved', label: 'Finalizado',     cor: 'text-gray-400',   badge: 'bg-gray-800 text-gray-500' },
]

export default function Conversations() {
  const [aba, setAba] = useState('open')
  const [conversations, setConversations] = useState([])
  const [contadores, setContadores] = useState({ open: 0, pending: 0, resolved: 0 })
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busca, setBusca] = useState('')
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const [assinado, setAssinado] = useState(false)

  // Modais
  const [modalTransferir, setModalTransferir] = useState(false)
  const [modalContato, setModalContato] = useState(false)
  const [modalNovaConversa, setModalNovaConversa] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [contatoForm, setContatoForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [instancias, setInstancias] = useState([])
  const [buscaContatos, setBuscaContatos] = useState('')
  const [contatosResultado, setContatosResultado] = useState([])
  const [novaConvForm, setNovaConvForm] = useState({ contactId: '', instanceId: '' })

  const { on } = useWS()
  const location = useLocation()
  const msgEndRef = useRef(null)

  useEffect(() => { carregarAba(aba) }, [aba])
  useEffect(() => { carregarContadores() }, [])

  useEffect(() => {
    if (location.state?.conversaId) {
      api.get(`/conversations/${location.state.conversaId}`).then(r => {
        setSelected(r.data)
        setMessages(r.data.messages)
        setAba(r.data.status || 'open')
      })
    }
  }, [])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return on('nova_mensagem', (data) => {
      if (selected?.id === data.conversationId) {
        setMessages(m => [...m, data.mensagem])
      }
      setConversations(c =>
        c.map(conv => conv.id === data.conversationId
          ? { ...conv, messages: [data.mensagem] }
          : conv
        )
      )
      carregarContadores()
    })
  }, [on, selected])

  useEffect(() => {
    return on('mensagem_silenciosa', (data) => {
      if (selected?.id === data.conversationId) {
        setMessages(m => [...m, data.mensagem])
      }
    })
  }, [on, selected])

  async function carregarAba(status, q = '') {
    const params = { status, limit: 100 }
    if (q) params.search = q
    const r = await api.get('/conversations', { params })
    setConversations(r.data.data ?? r.data)
  }

  async function carregarContadores() {
    const [a, b, c] = await Promise.all([
      api.get('/conversations', { params: { status: 'open',     limit: 1 } }),
      api.get('/conversations', { params: { status: 'pending',  limit: 1 } }),
      api.get('/conversations', { params: { status: 'resolved', limit: 1 } }),
    ])
    setContadores({
      open:     a.data.total ?? 0,
      pending:  b.data.total ?? 0,
      resolved: c.data.total ?? 0,
    })
  }

  async function abrirConversa(conv) {
    setSelected(conv)
    const r = await api.get(`/conversations/${conv.id}`)
    setMessages(r.data.messages ?? [])
    try {
      const rs = await api.get(`/conversations/${conv.id}/subscribe`)
      setAssinado(rs.data.assinado ?? false)
    } catch {
      setAssinado(false)
    }
  }

  async function toggleAssinatura() {
    if (!selected) return
    try {
      const r = await api.post(`/conversations/${selected.id}/subscribe`)
      setAssinado(r.data.assinado ?? !assinado)
    } catch {
      setAssinado(a => !a)
    }
  }

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!text.trim() || !selected || enviando) return
    setEnviando(true)
    try {
      const r = await api.post('/messages/texto', { conversationId: selected.id, conteudo: text })
      setMessages(m => [...m, r.data])
      setText('')
    } finally {
      setEnviando(false)
    }
  }

  async function enviarAnexo(e) {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    setUploadingAnexo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { url, mimetype } = up.data
      const tipo = mimetype?.startsWith('image/') ? 'image'
        : mimetype?.startsWith('video/') ? 'video'
        : mimetype?.startsWith('audio/') ? 'audio'
        : 'document'
      const r = await api.post('/messages/midia', {
        conversationId: selected.id,
        mediaUrl: url,
        tipo,
        legenda: '',
      })
      setMessages(m => [...m, r.data])
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar arquivo')
    } finally {
      setUploadingAnexo(false)
      e.target.value = ''
    }
  }

  async function mudarStatus(novoStatus) {
    const endpoint = novoStatus === 'resolved' ? 'resolve' : novoStatus === 'open' ? 'reopen' : null
    if (endpoint) {
      await api.post(`/conversations/${selected.id}/${endpoint}`)
    } else {
      await api.patch(`/conversations/${selected.id}`, { status: novoStatus })
    }
    setConversations(c => c.filter(cv => cv.id !== selected.id))
    setSelected(s => ({ ...s, status: novoStatus }))
    carregarContadores()
  }

  async function abrirNovaConversa() {
    const [ri, rc] = await Promise.all([
      api.get('/instances'),
      api.get('/contacts', { params: { limit: 20 } }),
    ])
    setInstancias(ri.data)
    setContatosResultado(rc.data.data ?? rc.data)
    setBuscaContatos('')
    setNovaConvForm({ contactId: '', instanceId: '' })
    setModalNovaConversa(true)
  }

  async function buscarContatos(q) {
    setBuscaContatos(q)
    const r = await api.get('/contacts', { params: { search: q, limit: 20 } })
    setContatosResultado(r.data.data ?? r.data)
  }

  async function iniciarConversa(e) {
    e.preventDefault()
    if (!novaConvForm.contactId || !novaConvForm.instanceId) return
    try {
      const r = await api.post('/conversations', novaConvForm)
      const conv = r.data
      setModalNovaConversa(false)
      setAba(conv.status === 'open' ? 'open' : conv.status === 'pending' ? 'pending' : 'open')
      setSelected(conv)
      setMessages(conv.messages ?? [])
      carregarAba(conv.status === 'open' ? 'open' : 'pending')
      carregarContadores()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao iniciar conversa')
    }
  }

  async function abrirTransferir() {
    try {
      const r = await api.get(`/conversations/${selected.id}/transferiveis`)
      setUsuarios(r.data)
    } catch {
      setUsuarios([])
    }
    setModalTransferir(true)
  }

  async function transferir(userId) {
    await api.post(`/conversations/${selected.id}/assign`, { userId })
    setModalTransferir(false)
    setConversations(c => c.filter(cv => cv.id !== selected.id))
    setSelected(null)
    carregarContadores()
  }

  function abrirEditarContato() {
    const c = selected?.contact
    setContatoForm({
      name: c?.name || '',
      phone: c?.phone || '',
      email: c?.email || '',
      notes: c?.notes || '',
    })
    setModalContato(true)
  }

  async function salvarContato(e) {
    e.preventDefault()
    const contactId = selected?.contact?.id
    if (!contactId) return
    try {
      const r = await api.put(`/contacts/${contactId}`, contatoForm)
      setSelected(s => ({ ...s, contact: r.data }))
      setConversations(list => list.map(cv =>
        cv.id === selected.id ? { ...cv, contact: r.data } : cv
      ))
      setModalContato(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar contato')
    }
  }

  const abaAtual = ABAS.find(a => a.key === aba)

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      {/* Sidebar de conversas */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">

        {/* Abas */}
        <div className="flex border-b border-gray-800">
          {ABAS.map(a => (
            <button
              key={a.key}
              onClick={() => { setAba(a.key); setSelected(null) }}
              className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                aba === a.key ? `${a.cor} border-b-2 border-current` : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {a.label}
              {contadores[a.key] > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs leading-none ${a.badge}`}>
                  {contadores[a.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Busca + Nova conversa */}
        <div className="px-3 py-2 border-b border-gray-800 flex gap-2">
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); carregarAba(aba, e.target.value) }}
            placeholder="Filtrar conversas..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
          />
          <button
            onClick={abrirNovaConversa}
            title="Nova conversa"
            className="px-2.5 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-bold text-white flex-shrink-0"
          >
            +
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="text-center text-gray-600 py-12 text-sm">
              <p className="text-2xl mb-2">
                {aba === 'open' ? '💬' : aba === 'pending' ? '⏳' : '✅'}
              </p>
              Nenhum {abaAtual?.label.toLowerCase()}
            </div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => abrirConversa(conv)}
              className={`p-3.5 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${
                selected?.id === conv.id ? 'bg-gray-900 border-l-2 border-l-green-500' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {conv.contact?.name || conv.contact?.phone || 'Desconhecido'}
                </span>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {conv.messages?.[0]?.sentAt
                    ? new Date(conv.messages[0].sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {conv.messages?.[0]?.content || conv.messages?.[0]?.body || '—'}
              </p>
              {conv.instance?.name && (
                <p className="text-xs text-gray-700 mt-0.5 truncate">via {conv.instance.name}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Painel de chat */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center gap-4">
            <div>
              <h3 className="font-semibold">{selected.contact?.name || selected.contact?.phone}</h3>
              <p className="text-xs text-gray-500">{selected.contact?.phone}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              {/* Assinar/Desassinar */}
              <button
                onClick={toggleAssinatura}
                className={`text-xs px-3 py-1.5 border rounded-lg ${
                  assinado
                    ? 'border-green-600 text-green-400 hover:border-green-500'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {assinado ? '🔕 Assinando' : '🔔 Assinar'}
              </button>
              {/* Editar contato */}
              <button
                onClick={abrirEditarContato}
                className="text-xs px-3 py-1.5 border border-gray-700 hover:border-blue-600 hover:text-blue-400 text-gray-400 rounded-lg"
              >
                Editar contato
              </button>
              {/* Transferir */}
              {selected.status !== 'resolved' && (
                <button
                  onClick={abrirTransferir}
                  className="text-xs px-3 py-1.5 border border-gray-700 hover:border-purple-600 hover:text-purple-400 text-gray-400 rounded-lg"
                >
                  Transferir
                </button>
              )}
              {selected.status !== 'pending' && (
                <button
                  onClick={() => mudarStatus('pending')}
                  className="text-xs px-3 py-1.5 border border-yellow-800 hover:bg-yellow-900 text-yellow-400 rounded-lg"
                >
                  Aguardar
                </button>
              )}
              {selected.status !== 'open' && (
                <button
                  onClick={() => mudarStatus('open')}
                  className="text-xs px-3 py-1.5 border border-gray-700 hover:border-green-600 hover:text-green-400 text-gray-400 rounded-lg"
                >
                  Reabrir
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => mudarStatus('resolved')}
                  className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg"
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm px-3 py-2 rounded-2xl text-sm break-words ${
                  msg.isSilent
                    ? 'bg-purple-900 border border-purple-700 text-purple-200'
                    : msg.direction === 'out'
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-800 text-gray-100'
                }`}>
                  {msg.isSilent && (
                    <p className="text-xs text-purple-400 mb-1 font-medium">Admin · intervenção silenciosa</p>
                  )}
                  {msg.mediaUrl && msg.type === 'image' && (
                    <img src={msg.mediaUrl} alt="imagem" className="rounded-lg max-w-full mb-1 max-h-48 object-cover" />
                  )}
                  {msg.mediaUrl && msg.type === 'video' && (
                    <video src={msg.mediaUrl} controls className="rounded-lg max-w-full mb-1 max-h-48" />
                  )}
                  {msg.mediaUrl && msg.type === 'audio' && (
                    <audio src={msg.mediaUrl} controls className="w-full mb-1" />
                  )}
                  {msg.mediaUrl && msg.type === 'document' && (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-300 hover:underline text-xs mb-1">
                      📄 {msg.mediaUrl.split('/').pop()}
                    </a>
                  )}
                  {msg.content || msg.body}
                  <p className="text-xs opacity-50 mt-1 text-right">
                    {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={enviarMensagem} className="p-4 border-t border-gray-800 flex gap-2 items-center">
            {/* Botão de anexo */}
            {selected.status !== 'resolved' && (
              <label className={`flex-shrink-0 cursor-pointer p-2 rounded-xl border border-gray-700 hover:border-green-600 transition-colors ${uploadingAnexo ? 'opacity-50 pointer-events-none' : ''}`} title="Anexar arquivo">
                <span className="text-lg leading-none">{uploadingAnexo ? '⏳' : '📎'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={enviarAnexo}
                  disabled={uploadingAnexo}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                />
              </label>
            )}
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={selected.status === 'resolved' ? 'Conversa finalizada' : 'Digite uma mensagem...'}
              disabled={selected.status === 'resolved'}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={enviando || selected.status === 'resolved'}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium flex-shrink-0"
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-sm gap-2">
          <p className="text-4xl">
            {aba === 'open' ? '💬' : aba === 'pending' ? '⏳' : '✅'}
          </p>
          <p>Selecione um atendimento para começar</p>
        </div>
      )}

      {/* Modal Nova Conversa */}
      {modalNovaConversa && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalNovaConversa(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-4">Nova conversa</h3>
            <form onSubmit={iniciarConversa} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Buscar contato</label>
                <input
                  value={buscaContatos}
                  onChange={e => buscarContatos(e.target.value)}
                  placeholder="Nome ou telefone..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
                {contatosResultado.length > 0 && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
                    {contatosResultado.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => { setNovaConvForm(f => ({ ...f, contactId: c.id })); setBuscaContatos(`${c.name} — ${c.phone}`); setContatosResultado([]) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${novaConvForm.contactId === c.id ? 'bg-green-900 text-green-300' : 'text-white'}`}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Instância WhatsApp</label>
                <select
                  required
                  value={novaConvForm.instanceId}
                  onChange={e => setNovaConvForm(f => ({ ...f, instanceId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione...</option>
                  {instancias.filter(i => i.status === 'conectado').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={!novaConvForm.contactId || !novaConvForm.instanceId} className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-lg text-sm font-medium">
                  Iniciar conversa
                </button>
                <button type="button" onClick={() => setModalNovaConversa(false)} className="flex-1 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-400">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferir */}
      {modalTransferir && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalTransferir(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-4">Transferir conversa</h3>
            {usuarios.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum agente disponível</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {usuarios.map(u => (
                  <button
                    key={u.id}
                    onClick={() => transferir(u.id)}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm"
                  >
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setModalTransferir(false)} className="mt-4 text-xs text-gray-500 hover:text-white w-full text-center">Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal Editar Contato */}
      {modalContato && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalContato(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-4">Editar contato</h3>
            <form onSubmit={salvarContato} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                <input
                  value={contatoForm.name}
                  onChange={e => setContatoForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
                <input
                  value={contatoForm.phone}
                  onChange={e => setContatoForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                <input
                  value={contatoForm.email}
                  onChange={e => setContatoForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Observações</label>
                <textarea
                  value={contatoForm.notes}
                  onChange={e => setContatoForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
                  Salvar
                </button>
                <button type="button" onClick={() => setModalContato(false)} className="flex-1 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-400">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
