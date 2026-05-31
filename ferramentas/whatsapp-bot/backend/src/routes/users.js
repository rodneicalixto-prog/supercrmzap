import bcrypt from 'bcryptjs'
import { requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function userRoutes(app) {
  app.addHook('preHandler', requireRole('admin', 'super_admin'))

  // Listar usuários do tenant
  app.get('/', async (req) => {
    return prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Criar usuário
  app.post('/', async (req, reply) => {
    const { name, email, password, role } = req.body
    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) return reply.status(409).send({ error: 'E-mail já cadastrado' })
    const hash = await bcrypt.hash(password, 12)
    return prisma.user.create({
      data: { tenantId: req.user.tenantId, name, email, passwordHash: hash, role: role || 'user' },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    })
  })

  // Editar usuário (nome, e-mail, senha, perfil)
  app.put('/:id', async (req, reply) => {
    const { name, email, password, role } = req.body
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const data = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.passwordHash = await bcrypt.hash(password, 12)

    return prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    })
  })

  // Ativar / suspender usuário
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

  // Remover usuário
  app.delete('/:id', async (req, reply) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.delete({ where: { id: req.params.id } })
    return { removido: true }
  })
}
