import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../services/api'
import { useWS } from '../contexts/WSContext'

export default function Kanban() {
  const [boards, setBoards] = useState([])
  const [active, setActive] = useState(null)
  const { on } = useWS()

  useEffect(() => {
    api.get('/kanban/boards').then(r => {
      setBoards(r.data)
      if (r.data.length) setActive(r.data[0])
    })
  }, [])

  useEffect(() => {
    return on('kanban_moved', ({ cardId, columnId, position }) => {
      setActive(board => {
        if (!board) return board
        const cards = board.cards.map(c => c.id === cardId ? { ...c, columnId, position } : c)
        return { ...board, cards }
      })
    })
  }, [on])

  async function onDragEnd(result) {
    if (!result.destination || !active) return
    const { draggableId, destination } = result
    await api.post('/kanban/cards/move', {
      cardId: draggableId,
      columnId: destination.droppableId,
      position: destination.index
    })
  }

  if (!active) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-600">
      Nenhum workflow criado
    </div>
  )

  const columns = active.columns || []

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h2 className="text-white text-xl font-bold mb-6">{active.workflowName}</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const cards = (active.cards || []).filter(c => c.columnId === col.id)
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
                              className="bg-gray-800 border border-gray-700 rounded-lg p-3"
                            >
                              <p className="text-sm text-white">{card.metadata?.title || 'Conversa'}</p>
                              <p className="text-xs text-gray-500 mt-1">{card.metadata?.phone || ''}</p>
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
  )
}
