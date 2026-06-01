import bcrypt from 'bcryptjs'
import { requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

const USER_SELECT = {
  id: true, name: true, email: true, role: true, status: true,
  lastLogin: true, createdAt: true, workHours: true, supervisorId: true, department: true,
  n8nWebhookUrl: true, openaiApiKey: true, openaiWebhook: true,
  responsibleInstances: { select: { instanceId: true } },
}

// Quem o requester pode ver/gerenciar
function whereUsuarios(user) {
  const base = { tenantId: user.tenantId }
  if (user.role === 'super_admin') return base                          // todos
  if (user.role === 'admin') return { ...base, role: { notIn: ['super_admin'] } }  // exceto super_admin
  if (user.role === 'supervisor') return { ...base, supervisorId: user.id }        // só sua equipe
  return { ...base, id: user.id }                                      // só a si mesmo
}

export default async function userRoutes(app) {
  // supervisor e acima podem listar usuários; users não
  app.addHook('preHandler', requireRole('admin', 'super_admin', 'supervisor'))

  app.get('/', async (req) => {
    return prisma.user.findMany({
      where: whereUsuarios(req.user),
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    })
  })

  // Criar usuário — admin+
  app.post('/', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const { name, email, password, role, workHours, instanceIds, supervisorId, department, n8nWebhookUrl, openaiApiKey, openaiWebhook } = req.body
    if (!name || !email || !password) return reply.status(400).send({ error: 'Nome, e-mail e senha são obrigatórios' })

    if (req.user.role === 'admin' && role === 'super_admin') {
      return reply.status(403).send({ error: 'Admin não pode criar super_admin' })
    }

    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) return reply.status(409).send({ error: 'E-mail já cadastrado' })

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        name, email,
        passwordHash: hash,
        role: role || 'user',
        ...(workHours && { workHours }),
        ...(supervisorId && { supervisorId }),
        ...(department && { department }),
        ...(n8nWebhookUrl && { n8nWebhookUrl }),
        ...(openaiApiKey && { openaiApiKey }),
        ...(openaiWebhook && { openaiWebhook }),
      },
      select: USER_SELECT,
    })

    if (instanceIds?.length) {
      await prisma.userInstance.createMany({
        data: instanceIds.map(instanceId => ({ userId: user.id, instanceId })),
        skipDuplicates: true,
      })
    }
    return user
  })

  app.put('/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const { name, email, password, role, workHours, instanceIds, supervisorId, department, n8nWebhookUrl, openaiApiKey, openaiWebhook } = req.body
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    if (req.user.role === 'admin' && role === 'super_admin') {
      return reply.status(403).send({ error: 'Admin não pode promover para super_admin' })
    }

    const data = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.passwordHash = await bcrypt.hash(password, 12)
    if (workHours !== undefined) data.workHours = workHours
    if (supervisorId !== undefined) data.supervisorId = supervisorId || null
    if (department !== undefined) data.department = department || null
    if (n8nWebhookUrl !== undefined) data.n8nWebhookUrl = n8nWebhookUrl || null
    if (openaiApiKey !== undefined) data.openaiApiKey = openaiApiKey || null
    if (openaiWebhook !== undefined) data.openaiWebhook = openaiWebhook || null

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT,
    })

    if (instanceIds !== undefined) {
      await prisma.userInstance.deleteMany({ where: { userId: req.params.id } })
      if (instanceIds.length) {
        await prisma.userInstance.createMany({
          data: instanceIds.map(instanceId => ({ userId: req.params.id, instanceId })),
          skipDuplicates: true,
        })
      }
    }
    return updated
  })

  app.patch('/:id/status', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return prisma.user.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      select: { id: true, status: true },
    })
  })

  app.delete('/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.delete({ where: { id: req.params.id } })
    return { removido: true }
  })
}
