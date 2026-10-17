import bcrypt from 'bcryptjs'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function tenantRoutes(app) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireRole('super_admin'))

  // Listar todos os tenants
  app.get('/', async () => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, instances: true, contacts: true, conversations: true } },
      },
    })
    return tenants
  })

  // Criar tenant + usuário admin
  app.post('/', async (req, reply) => {
    const { name, plan, adminName, adminEmail, adminPassword } = req.body
    if (!name || !adminEmail || !adminPassword) {
      return reply.status(400).send({ error: 'Nome, e-mail e senha do admin são obrigatórios' })
    }

    const existente = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (existente) return reply.status(409).send({ error: 'E-mail já cadastrado' })

    const tenant = await prisma.tenant.create({
      data: { name, plan: plan || 'free', status: 'active' },
    })

    const hash = await bcrypt.hash(adminPassword, 12)
    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: adminName || adminEmail.split('@')[0],
        email: adminEmail,
        passwordHash: hash,
        role: 'admin',
        status: 'active',
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return reply.status(201).send({ tenant, admin })
  })

  // Atualizar plano / status do tenant
  app.put('/:id', async (req, reply) => {
    const { plan, status } = req.body
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })
    return prisma.tenant.update({
      where: { id: req.params.id },
      data: { ...(plan && { plan }), ...(status && { status }) },
    })
  })

  // Suspender / ativar tenant
  app.patch('/:id/status', async (req, reply) => {
    const { status } = req.body
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })
    return prisma.tenant.update({ where: { id: req.params.id }, data: { status } })
  })

  // Remover tenant e todos os dados
  app.delete('/:id', async (req, reply) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const tid = req.params.id
    const convs = await prisma.conversation.findMany({ where: { tenantId: tid }, select: { id: true } })
    const convIds = convs.map(c => c.id)
    const boards = await prisma.kanbanBoard.findMany({ where: { tenantId: tid }, select: { id: true } })
    const boardIds = boards.map(b => b.id)

    // Tudo em transação — falha em qualquer etapa reverte tudo
    await prisma.$transaction([
      ...(convIds.length ? [
        prisma.conversationSubscriber.deleteMany({ where: { conversationId: { in: convIds } } }),
        prisma.kanbanCard.deleteMany({ where: { conversationId: { in: convIds } } }),
        prisma.message.deleteMany({ where: { conversationId: { in: convIds } } }),
        prisma.conversation.deleteMany({ where: { tenantId: tid } }),
      ] : []),
      ...(boardIds.length ? [
        prisma.kanbanCard.deleteMany({ where: { boardId: { in: boardIds } } }),
        prisma.kanbanBoard.deleteMany({ where: { tenantId: tid } }),
      ] : []),
      prisma.schedule.deleteMany({ where: { tenantId: tid } }),
      prisma.contact.deleteMany({ where: { tenantId: tid } }),
      prisma.waInstance.deleteMany({ where: { tenantId: tid } }),
      prisma.subscription.deleteMany({ where: { tenantId: tid } }),
      prisma.webhook.deleteMany({ where: { tenantId: tid } }),
      prisma.actionsLog.deleteMany({ where: { tenantId: tid } }),
      prisma.user.deleteMany({ where: { tenantId: tid } }),
      prisma.tenant.delete({ where: { id: tid } }),
    ])
    return { removido: true }
  })
}
