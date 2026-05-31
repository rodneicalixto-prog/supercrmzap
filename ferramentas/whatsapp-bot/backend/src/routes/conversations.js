import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'

export default async function conversationRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    const { status, assigned, page = 1, limit = 30 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = { tenantId: req.user.tenantId }
    if (req.user.role === 'user') where.userId = req.user.id
    if (status) where.status = status
    if (assigned) where.assignedTo = assigned
    const [data, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: { contact: true, instance: true, messages: { take: 1, orderBy: { sentAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.conversation.count({ where }),
    ])
    return { data, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req, reply) => {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { contact: true, instance: true, messages: { orderBy: { sentAt: 'asc' } } }
    })
    if (!conv) return reply.status(404).send({ error: 'Não encontrada' })
    return conv
  })

  app.post('/:id/assign', { preHandler: requireRole('admin', 'super_admin') }, async (req) => {
    const { userId } = req.body
    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { assignedTo: userId }
    })
    broadcast(req.user.tenantId, { event: 'conversa_atribuida', data: { conversationId: conv.id, userId } })
    return conv
  })

  app.post('/:id/resolve', async (req) => {
    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: 'resolved' }
    })
    broadcast(req.user.tenantId, { event: 'conversa_resolvida', data: { conversationId: conv.id } })
    return conv
  })

  app.post('/:id/reopen', async (req) => {
    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: 'open' }
    })
    return conv
  })

  // Intervenção silenciosa — admin envia mensagem que só o agente vê
  app.post('/:id/silent', { preHandler: requireRole('admin', 'super_admin') }, async (req) => {
    const { content } = req.body
    const msg = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        direction: 'out',
        type: 'text',
        content,
        isSilent: true
      }
    })
    broadcast(req.user.tenantId, { event: 'silent_message', data: { conversationId: req.params.id, message: msg, admin: req.user.name } })
    return msg
  })
}
