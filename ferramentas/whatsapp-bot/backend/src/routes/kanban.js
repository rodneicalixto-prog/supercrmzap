import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'

export default async function kanbanRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/boards', async (req) => {
    return prisma.kanbanBoard.findMany({
      where: { tenantId: req.user.tenantId },
      include: { cards: { orderBy: { position: 'asc' } } }
    })
  })

  app.post('/boards', async (req) => {
    const { workflowName, columns } = req.body
    return prisma.kanbanBoard.create({
      data: { tenantId: req.user.tenantId, workflowName, columns }
    })
  })

  app.post('/cards/move', async (req) => {
    const { cardId, columnId, position } = req.body
    const card = await prisma.kanbanCard.update({
      where: { id: cardId },
      data: { columnId, position }
    })
    broadcast(req.user.tenantId, {
      event: 'kanban_movido',
      data: { cardId, columnId, position }
    })
    return card
  })

  app.post('/cards', async (req) => {
    const { boardId, columnId, conversationId, metadata } = req.body
    const count = await prisma.kanbanCard.count({ where: { boardId, columnId } })
    return prisma.kanbanCard.create({
      data: { boardId, columnId, conversationId, position: count, metadata }
    })
  })
}
