import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function contactRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    const { search, tag } = req.query
    const where = { tenantId: req.user.tenantId }
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } }
    ]
    if (tag) where.tags = { has: tag }
    return prisma.contact.findMany({ where, orderBy: { name: 'asc' } })
  })

  app.post('/', async (req) => {
    const { name, phone, email, tags, notes } = req.body
    return prisma.contact.create({
      data: { tenantId: req.user.tenantId, name, phone, email, tags: tags || [], notes }
    })
  })

  app.put('/:id', async (req, reply) => {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!contact) return reply.status(404).send({ error: 'Não encontrado' })
    return prisma.contact.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', async (req, reply) => {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!contact) return reply.status(404).send({ error: 'Não encontrado' })
    await prisma.contact.delete({ where: { id: req.params.id } })
    return { deleted: true }
  })
}
