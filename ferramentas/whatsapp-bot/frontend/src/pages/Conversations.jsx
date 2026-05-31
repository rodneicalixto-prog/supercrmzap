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
  const { on } = useWS()
  const location = useLocation()
  const msgEndRef = useRef(null)

  useEffect(() => { carregarAba(aba) }, [aba])

  useEffect(() => { carregarContadores() }, [])

  // Abrir conversa via state (vindo da página de Fila)
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

  async function carregarAba(status) {
    const r = await api.get('/conversations', { params: { status, limit: 100 } })
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
            <div className="flex gap-2 flex-shrink-0">
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
          <form onSubmit={enviarMensagem} className="p-4 border-t border-gray-800 flex gap-2">
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
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium"
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
    </div>
  )
}
