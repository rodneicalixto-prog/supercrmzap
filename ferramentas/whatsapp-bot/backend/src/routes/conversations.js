import { authenticate, requireRole, podeTransferir } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'

// Monta cláusula WHERE de conversas de acordo com o papel do usuário
async function whereConversas(user) {
  const base = { tenantId: user.tenantId }

  if (user.role === 'super_admin' || user.role === 'admin') {
    return base // vê todas do tenant
  }

  if (user.role === 'supervisor') {
    // Vê conversas da própria equipe (subordinados diretos) + as próprias
    const subordinados = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    })
    const ids = [user.id, ...subordinados.map(u => u.id)]
    return { ...base, userId: { in: ids } }
  }

  // user: apenas as próprias
  return { ...base, userId: user.id }
}

export default async function conversationRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    const { status, assigned, page = 1, limit = 30, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = await whereConversas(req.user)
    if (status) where.status = status
    if (assigned) where.assignedTo = assigned
    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }
    }
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

  // Criar ou recuperar conversa ativa com um contato
  app.post('/', async (req, reply) => {
    const { contactId, instanceId } = req.body
    if (!contactId || !instanceId) return reply.status(400).send({ error: 'contactId e instanceId são obrigatórios' })

    const [contato, instancia] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, tenantId: req.user.tenantId } }),
      prisma.waInstance.findFirst({ where: { id: instanceId, tenantId: req.user.tenantId } }),
    ])
    if (!contato) return reply.status(404).send({ error: 'Contato não encontrado' })
    if (!instancia) return reply.status(404).send({ error: 'Instância não encontrada' })

    let conversa = await prisma.conversation.findFirst({
      where: { tenantId: req.user.tenantId, contactId, status: { in: ['open', 'pending'] } },
      include: { contact: true, instance: true, messages: { orderBy: { sentAt: 'asc' } } },
    })
    if (!conversa) {
      conversa = await prisma.conversation.create({
        data: {
          tenantId: req.user.tenantId,
          userId: req.user.id,
          instanceId,
          contactId,
          status: 'open',
        },
        include: { contact: true, instance: true, messages: { orderBy: { sentAt: 'asc' } } },
      })
    }
    return conversa
  })

  app.get('/:id', async (req, reply) => {
    const where = await whereConversas(req.user)
    const conv = await prisma.conversation.findFirst({
      where: { ...where, id: req.params.id },
      include: { contact: true, instance: true, messages: { orderBy: { sentAt: 'asc' } } }
    })
    if (!conv) return reply.status(404).send({ error: 'Não encontrada' })
    return conv
  })

  // Transferir conversa — valida hierarquia
  app.post('/:id/assign', async (req, reply) => {
    const { userId } = req.body

    // Só admin+ pode transferir arbitrariamente; supervisor e user têm restrições
    if (req.user.role === 'user') {
      // user só pode se for admin ou supervisor da conversa
      return reply.status(403).send({ error: 'Usuários não podem reatribuir conversas. Use o botão Transferir.' })
    }

    const destino = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.user.tenantId },
    })
    if (!destino) return reply.status(404).send({ error: 'Usuário destinatário não encontrado' })

    const { ok, motivo } = podeTransferir(req.user.role, destino.role)
    if (!ok) return reply.status(403).send({ error: motivo })

    // supervisor só pode transferir dentro da sua equipe (+ outros supervisores)
    if (req.user.role === 'supervisor' && destino.role === 'user') {
      const naEquipe = destino.supervisorId === req.user.id
      if (!naEquipe) return reply.status(403).send({ error: 'Você só pode transferir para membros da sua equipe' })
    }

    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { assignedTo: userId, userId }
    })
    broadcast(req.user.tenantId, { event: 'conversa_atribuida', data: { conversationId: conv.id, userId } })
    return conv
  })

  // Listar usuários elegíveis para transferência (filtrado por hierarquia)
  app.get('/:id/transferiveis', async (req, reply) => {
    const { role, id: myId, tenantId, supervisorId } = req.user

    let where = { tenantId, status: 'active', id: { not: myId } }

    if (role === 'super_admin') {
      // pode transferir para qualquer um
    } else if (role === 'admin') {
      // não pode transferir para super_admin
      where.role = { notIn: ['super_admin'] }
    } else if (role === 'supervisor') {
      // pode transferir para sua equipe e outros supervisores
      where.OR = [
        { supervisorId: myId },              // minha equipe
        { role: 'supervisor', id: { not: myId } }, // outros supervisores
      ]
    } else {
      // user: apenas seus pares (mesmo supervisorId) e seu supervisor
      const conds = []
      if (supervisorId) {
        conds.push({ id: supervisorId })                    // seu supervisor
        conds.push({ supervisorId, role: 'user' })          // colegas
      } else {
        conds.push({ role: 'user', tenantId })              // peers sem supervisor definido
      }
      where.OR = conds
    }

    const usuarios = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, supervisorId: true },
      orderBy: { name: 'asc' },
    })
    return usuarios
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

  app.patch('/:id', async (req, reply) => {
    const { status } = req.body
    const allowed = ['open', 'pending', 'resolved']
    if (status && !allowed.includes(status)) return reply.status(400).send({ error: 'Status inválido' })
    const where = await whereConversas(req.user)
    const conv = await prisma.conversation.findFirst({ where: { ...where, id: req.params.id } })
    if (!conv) return reply.status(404).send({ error: 'Não encontrada' })
    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { ...(status && { status }) },
    })
    broadcast(req.user.tenantId, { event: 'conversa_atualizada', data: { conversationId: updated.id, status: updated.status } })
    return updated
  })

  // Assinar / desassinar conversa
  app.post('/:id/subscribe', async (req) => {
    const existing = await prisma.conversationSubscriber.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
    })
    if (existing) {
      await prisma.conversationSubscriber.delete({ where: { id: existing.id } })
      return { assinado: false }
    }
    await prisma.conversationSubscriber.create({
      data: { conversationId: req.params.id, userId: req.user.id },
    })
    return { assinado: true }
  })

  app.get('/:id/subscribe', async (req) => {
    const existing = await prisma.conversationSubscriber.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
    })
    return { assinado: !!existing }
  })

  // Intervenção silenciosa — admin/supervisor
  app.post('/:id/silent', { preHandler: requireRole('admin', 'super_admin', 'supervisor') }, async (req) => {
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
