import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

const STATUS_LABEL = {
  open: 'Em atendimento',
  pending: 'Aguardando',
  resolved: 'Resolvido',
}

const STATUS_COLOR = {
  open: 'bg-green-900 text-green-400',
  pending: 'bg-yellow-900 text-yellow-400',
  resolved: 'bg-gray-800 text-gray-500',
}

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { on } = useWS()

  useEffect(() => {
    api.get('/conversations', { params: { limit: 100 } }).then(r => setConversations(r.data.data ?? r.data))
  }, [])

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
    })
  }, [on, selected])

  useEffect(() => {
    return on('mensagem_silenciosa', (data) => {
      if (selected?.id === data.conversationId) {
        setMessages(m => [...m, data.mensagem])
      }
    })
  }, [on, selected])

  async function abrirConversa(conv) {
    setSelected(conv)
    const r = await api.get(`/conversations/${conv.id}`)
    setMessages(r.data.messages)
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

  async function resolver() {
    await api.post(`/conversations/${selected.id}/resolve`)
    setConversations(c => c.map(conv =>
      conv.id === selected.id ? { ...conv, status: 'resolved' } : conv
    ))
    setSelected(s => ({ ...s, status: 'resolved' }))
  }

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      {/* Lista de conversas */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Atendimentos</h2>
          <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversa{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-center text-gray-600 py-12 text-sm">Nenhum atendimento ativo</p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => abrirConversa(conv)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selected?.id === conv.id ? 'bg-gray-900 border-l-2 border-l-green-500' : ''}`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium text-sm truncate">{conv.contact?.name || conv.contact?.phone}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_COLOR[conv.status] || 'bg-gray-800 text-gray-500'}`}>
                  {STATUS_LABEL[conv.status] || conv.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{conv.messages?.[0]?.content || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de chat */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{selected.contact?.name}</h3>
              <p className="text-xs text-gray-500">{selected.contact?.phone}</p>
            </div>
            <div className="flex gap-2">
              {selected.status === 'resolved' ? (
                <button
                  onClick={async () => {
                    await api.post(`/conversations/${selected.id}/reopen`)
                    setConversations(c => c.map(cv => cv.id === selected.id ? { ...cv, status: 'open' } : cv))
                    setSelected(s => ({ ...s, status: 'open' }))
                  }}
                  className="text-xs px-3 py-1.5 border border-gray-700 hover:border-green-600 hover:text-green-400 rounded-lg text-gray-400"
                >
                  Reabrir
                </button>
              ) : (
                <button
                  onClick={resolver}
                  className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg"
                >
                  Resolver
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
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
                  {msg.content}
                  <p className="text-xs opacity-50 mt-1 text-right">
                    {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input de mensagem */}
          <form onSubmit={enviarMensagem} className="p-4 border-t border-gray-800 flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              disabled={selected.status === 'resolved'}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={enviando || selected.status === 'resolved'}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium"
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Selecione um atendimento para começar
        </div>
      )}
    </div>
  )
}
