import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function scheduleRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    return prisma.schedule.findMany({
      where: { userId: req.user.id },
      include: { contact: true },
      orderBy: { datetime: 'asc' }
    })
  })

  app.post('/', async (req) => {
    const { contactId, title, datetime } = req.body
    return prisma.schedule.create({
      data: { tenantId: req.user.tenantId, userId: req.user.id, contactId, title, datetime: new Date(datetime) }
    })
  })

  app.delete('/:id', async (req) => {
    await prisma.schedule.delete({ where: { id: req.params.id } })
    return { deleted: true }
  })
}
