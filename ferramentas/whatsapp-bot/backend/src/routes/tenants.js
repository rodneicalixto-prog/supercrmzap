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

    // Remoção em cascata manual (sem ON DELETE CASCADE no schema)
    const convs = await prisma.conversation.findMany({ where: { tenantId: req.params.id }, select: { id: true } })
    const convIds = convs.map(c => c.id)
    if (convIds.length) {
      await prisma.kanbanCard.deleteMany({ where: { conversationId: { in: convIds } } })
      await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } })
      await prisma.conversation.deleteMany({ where: { tenantId: req.params.id } })
    }
    const boards = await prisma.kanbanBoard.findMany({ where: { tenantId: req.params.id }, select: { id: true } })
    if (boards.length) {
      await prisma.kanbanCard.deleteMany({ where: { boardId: { in: boards.map(b => b.id) } } })
      await prisma.kanbanBoard.deleteMany({ where: { tenantId: req.params.id } })
    }
    await prisma.schedule.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.contact.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.waInstance.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.subscription.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.webhook.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.actionsLog.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.user.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.tenant.delete({ where: { id: req.params.id } })
    return { removido: true }
  })
}
