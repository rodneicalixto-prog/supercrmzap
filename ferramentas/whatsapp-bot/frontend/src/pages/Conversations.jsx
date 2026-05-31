import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const { on } = useWS()

  useEffect(() => {
    api.get('/conversations').then(r => setConversations(r.data))
  }, [])

  useEffect(() => {
    return on('new_message', (data) => {
      if (selected?.id === data.conversationId) {
        setMessages(m => [...m, data.message])
      }
      setConversations(c =>
        c.map(conv => conv.id === data.conversationId
          ? { ...conv, messages: [data.message] }
          : conv
        )
      )
    })
  }, [on, selected])

  async function openConversation(conv) {
    setSelected(conv)
    const r = await api.get(`/conversations/${conv.id}`)
    setMessages(r.data.messages)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || !selected) return
    await api.post('/messages/text', { conversationId: selected.id, content: text })
    setText('')
  }

  async function resolve() {
    await api.post(`/conversations/${selected.id}/resolve`)
    setConversations(c => c.map(conv => conv.id === selected.id ? { ...conv, status: 'resolved' } : conv))
    setSelected(s => ({ ...s, status: 'resolved' }))
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Lista */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Atendimentos</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selected?.id === conv.id ? 'bg-gray-900' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm">{conv.contact?.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${conv.status === 'open' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                  {conv.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{conv.messages?.[0]?.content || '...'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{selected.contact?.name}</h3>
              <p className="text-xs text-gray-500">{selected.contact?.phone}</p>
            </div>
            <button onClick={resolve} className="text-xs px-3 py-1 bg-green-700 hover:bg-green-600 rounded-lg">
              Resolver
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                  msg.isSilent ? 'bg-purple-900 border border-purple-700 text-purple-200' :
                  msg.direction === 'out' ? 'bg-green-700' : 'bg-gray-800'
                }`}>
                  {msg.isSilent && <p className="text-xs text-purple-400 mb-1">Admin · silencioso</p>}
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
            <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium">
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          Selecione um atendimento
        </div>
      )}
    </div>
  )
}
