import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

const COLUNAS_PADRAO = [
  { id: 'novo', name: 'Novo' },
  { id: 'em_andamento', name: 'Em andamento' },
  { id: 'aguardando', name: 'Aguardando' },
  { id: 'concluido', name: 'Concluído' },
]

export default function Kanban() {
  const [boards, setBoards] = useState([])
  const [active, setActive] = useState(null)
  const [modalBoard, setModalBoard] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const { on } = useWS()

  useEffect(() => {
    api.get('/kanban/boards').then(r => {
      setBoards(r.data)
      if (r.data.length) setActive(r.data[0])
    })
  }, [])

  useEffect(() => {
    return on('kanban_movido', ({ cardId, columnId, position }) => {
      setActive(board => {
        if (!board) return board
        return { ...board, cards: board.cards.map(c => c.id === cardId ? { ...c, columnId, position } : c) }
      })
    })
  }, [on])

  useEffect(() => {
    return on('kanban_card_removido', ({ cardId }) => {
      setActive(board => {
        if (!board) return board
        return { ...board, cards: board.cards.filter(c => c.id !== cardId) }
      })
    })
  }, [on])

  async function criarBoard(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      const r = await api.post('/kanban/boards', { workflowName: novoNome.trim(), columns: COLUNAS_PADRAO })
      setBoards(b => [...b, r.data])
      setActive(r.data)
      setModalBoard(false)
      setNovoNome('')
    } finally {
      setCriando(false)
    }
  }

  async function removerBoard() {
    if (!active) return
    if (!confirm(`Remover o board "${active.workflowName}" e todos os seus cards?`)) return
    await api.delete(`/kanban/boards/${active.id}`)
    const novos = boards.filter(b => b.id !== active.id)
    setBoards(novos)
    setActive(novos[0] || null)
  }

  async function removerCard(cardId) {
    await api.delete(`/kanban/cards/${cardId}`)
    setActive(board => ({ ...board, cards: board.cards.filter(c => c.id !== cardId) }))
  }

  async function onDragEnd(result) {
    if (!result.destination || !active) return
    const { draggableId, source, destination } = result
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    setActive(board => ({
      ...board,
      cards: board.cards.map(c => c.id === draggableId
        ? { ...c, columnId: destination.droppableId, position: destination.index }
        : c
      )
    }))
    await api.post('/kanban/cards/move', {
      cardId: draggableId,
      columnId: destination.droppableId,
      position: destination.index,
    })
  }

  if (!boards.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-gray-500 text-sm">Nenhum workflow criado</p>
        <button
          onClick={() => setModalBoard(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg"
        >
          + Criar workflow
        </button>
        {modalBoard && (
          <ModalCriarBoard
            novoNome={novoNome} setNovoNome={setNovoNome}
            criando={criando} onSubmit={criarBoard}
            onClose={() => { setModalBoard(false); setNovoNome('') }}
          />
        )}
      </div>
    )
  }

  const columns = active?.columns || []

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
        <select
          value={active?.id || ''}
          onChange={e => setActive(boards.find(b => b.id === e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
        >
          {boards.map(b => <option key={b.id} value={b.id}>{b.workflowName}</option>)}
        </select>
        <button onClick={() => setModalBoard(true)} className="text-xs px-3 py-1.5 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg">
          + Novo workflow
        </button>
        {active && (
          <button onClick={removerBoard} className="text-xs px-3 py-1.5 border border-gray-700 hover:border-red-700 hover:text-red-400 text-gray-500 rounded-lg ml-auto">
            Remover workflow
          </button>
        )}
      </div>

      {active && (
        <div className="flex-1 overflow-auto p-6">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4">
              {columns.map(col => {
                const cards = (active.cards || [])
                  .filter(c => c.columnId === col.id)
                  .sort((a, b) => a.position - b.position)
                return (
                  <div key={col.id} className="w-72 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-300">{col.name}</h3>
                      <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-20 rounded-xl p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-gray-800' : 'bg-gray-900'}`}
                        >
                          {cards.map((card, i) => (
                            <Draggable key={card.id} draggableId={card.id} index={i}>
                              {(p) => (
                                <div
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  {...p.dragHandleProps}
                                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 group relative"
                                >
                                  <p className="text-sm text-white pr-5">{card.metadata?.title || 'Conversa'}</p>
                                  {card.metadata?.phone && <p className="text-xs text-gray-500 mt-1">{card.metadata.phone}</p>}
                                  <button
                                    onClick={() => removerCard(card.id)}
                                    className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {modalBoard && (
        <ModalCriarBoard
          novoNome={novoNome} setNovoNome={setNovoNome}
          criando={criando} onSubmit={criarBoard}
          onClose={() => { setModalBoard(false); setNovoNome('') }}
        />
      )}
    </div>
  )
}

function ModalCriarBoard({ novoNome, setNovoNome, criando, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-white mb-4">Novo workflow Kanban</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome do workflow</label>
            <input
              required
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Ex: Funil de vendas"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <p className="text-xs text-gray-500">Colunas: Novo · Em andamento · Aguardando · Concluído</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={criando} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
              {criando ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
