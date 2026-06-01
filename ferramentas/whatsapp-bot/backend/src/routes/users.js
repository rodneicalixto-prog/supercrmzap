import bcrypt from 'bcryptjs'
import { requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

const USER_SELECT = {
  id: true, name: true, email: true, role: true, status: true,
  lastLogin: true, createdAt: true, workHours: true,
  responsibleInstances: { select: { instanceId: true } },
}

export default async function userRoutes(app) {
  app.addHook('preHandler', requireRole('admin', 'super_admin'))

  app.get('/', async (req) => {
    return prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/', async (req, reply) => {
    const { name, email, password, role, workHours, instanceIds } = req.body
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
      },
      select: USER_SELECT,
    })

    if (instanceIds?.length) {
      await prisma.userInstance.createMany({
        data: instanceIds.map(instanceId => ({ userId: user.id, instanceId })),
        skipDuplicates: true,
      })
    }

    return { ...user, responsibleInstances: instanceIds?.map(id => ({ instanceId: id })) || [] }
  })

  app.put('/:id', async (req, reply) => {
    const { name, email, password, role, workHours, instanceIds } = req.body
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const data = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.passwordHash = await bcrypt.hash(password, 12)
    if (workHours !== undefined) data.workHours = workHours

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

  app.patch('/:id/status', async (req, reply) => {
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

  app.delete('/:id', async (req, reply) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.delete({ where: { id: req.params.id } })
    return { removido: true }
  })
}
