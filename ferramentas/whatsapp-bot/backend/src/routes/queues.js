import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function queuesRoutes(app) {
  app.addHook('preHandler', authenticate)

  // Listar conversas na fila (sem agente atribuído, status = aberta)
  app.get('/', async (req) => {
    const { instanceId, page = 1, limit = 30 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      tenantId: req.user.tenantId,
      status: 'aberta',
      userId: null,   // sem agente atribuído = na fila
    }
    if (instanceId) where.instanceId = instanceId

    const [data, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'asc' }, // mais antigas primeiro
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          instance: { select: { id: true, name: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, createdAt: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ])

    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // Assumir atendimento (sai da fila e atribui ao agente logado)
  app.patch('/:id/assumir', async (req, reply) => {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!conv) return reply.status(404).send({ error: 'Conversa não encontrada' })
    if (conv.userId) return reply.status(409).send({ error: 'Já está sendo atendida por outro agente' })

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { userId: req.user.id },
    })
    return updated
  })

  // Devolver à fila (remove agente atribuído)
  app.patch('/:id/devolver', async (req, reply) => {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!conv) return reply.status(404).send({ error: 'Conversa não encontrada' })

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { userId: null },
    })
    return updated
  })

  // Transferir para outro agente
  app.patch('/:id/transferir', async (req, reply) => {
    const { userId } = req.body
    if (!userId) return reply.status(400).send({ error: 'userId do agente destino é obrigatório' })

    const [conv, agente] = await Promise.all([
      prisma.conversation.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } }),
      prisma.user.findFirst({ where: { id: userId, tenantId: req.user.tenantId } }),
    ])
    if (!conv) return reply.status(404).send({ error: 'Conversa não encontrada' })
    if (!agente) return reply.status(404).send({ error: 'Agente não encontrado' })

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { userId },
    })
    return updated
  })

  // Estatísticas da fila
  app.get('/stats', async (req) => {
    const tenantId = req.user.tenantId

    const [naFila, emAtendimento, encerradas] = await Promise.all([
      prisma.conversation.count({ where: { tenantId, status: 'aberta', userId: null } }),
      prisma.conversation.count({ where: { tenantId, status: 'aberta', userId: { not: null } } }),
      prisma.conversation.count({ where: { tenantId, status: 'encerrada' } }),
    ])

    return { naFila, emAtendimento, encerradas }
  })
}
