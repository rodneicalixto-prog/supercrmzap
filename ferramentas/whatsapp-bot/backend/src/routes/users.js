import bcrypt from 'bcryptjs'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function userRoutes(app) {
  app.addHook('preHandler', requireRole('admin', 'super_admin'))

  app.get('/', async (req) => {
    return prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, createdAt: true }
    })
  })

  app.post('/', async (req) => {
    const { name, email, password, role } = req.body
    const hash = await bcrypt.hash(password, 12)
    return prisma.user.create({
      data: { tenantId: req.user.tenantId, name, email, passwordHash: hash, role: role || 'user' },
      select: { id: true, name: true, email: true, role: true, status: true }
    })
  })

  app.patch('/:id/status', async (req) => {
    return prisma.user.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      select: { id: true, status: true }
    })
  })

  app.delete('/:id', async (req) => {
    await prisma.user.delete({ where: { id: req.params.id } })
    return { deleted: true }
  })
}
