import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'

export default async function kanbanRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/boards', async (req) => {
    return prisma.kanbanBoard.findMany({
      where: { tenantId: req.user.tenantId },
      include: { cards: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    })
  })

  app.post('/boards', async (req) => {
    const { workflowName, columns } = req.body
    return prisma.kanbanBoard.create({
      data: { tenantId: req.user.tenantId, workflowName, columns: columns || [] },
      include: { cards: true },
    })
  })

  app.put('/boards/:id', async (req, reply) => {
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!board) return reply.status(404).send({ error: 'Board não encontrado' })
    const { workflowName, columns } = req.body
    return prisma.kanbanBoard.update({
      where: { id: req.params.id },
      data: { ...(workflowName && { workflowName }), ...(columns && { columns }) },
      include: { cards: { orderBy: { position: 'asc' } } },
    })
  })

  app.delete('/boards/:id', async (req, reply) => {
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!board) return reply.status(404).send({ error: 'Board não encontrado' })
    // Remove cards primeiro (FK)
    await prisma.kanbanCard.deleteMany({ where: { boardId: req.params.id } })
    await prisma.kanbanBoard.delete({ where: { id: req.params.id } })
    return { removido: true }
  })

  app.post('/cards', async (req) => {
    const { boardId, columnId, conversationId, metadata } = req.body
    const count = await prisma.kanbanCard.count({ where: { boardId, columnId } })
    return prisma.kanbanCard.create({
      data: { boardId, columnId, conversationId, position: count, metadata },
    })
  })

  app.post('/cards/move', async (req) => {
    const { cardId, columnId, position } = req.body
    const card = await prisma.kanbanCard.update({
      where: { id: cardId },
      data: { columnId, position },
    })
    broadcast(req.user.tenantId, { event: 'kanban_movido', data: { cardId, columnId, position } })
    return card
  })

  app.delete('/cards/:id', async (req, reply) => {
    const card = await prisma.kanbanCard.findUnique({ where: { id: req.params.id } })
    if (!card) return reply.status(404).send({ error: 'Card não encontrado' })
    await prisma.kanbanCard.delete({ where: { id: req.params.id } })
    broadcast(req.user.tenantId, { event: 'kanban_card_removido', data: { cardId: req.params.id } })
    return { removido: true }
  })
}
