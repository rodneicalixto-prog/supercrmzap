import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { evolutionApi } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function instanceRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    return prisma.waInstance.findMany({
      where: { tenantId: req.user.tenantId, userId: req.user.id }
    })
  })

  app.post('/', async (req, reply) => {
    const { name } = req.body
    const evo = await evolutionApi.post('/instance/create', {
      instanceName: `${req.user.id}_${name}`,
      webhook: `${process.env.API_URL}/webhook/evolution/${req.user.id}`
    })
    const instance = await prisma.waInstance.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        name,
        status: 'disconnected',
        webhookUrl: `${process.env.API_URL}/webhook/evolution/${req.user.id}`
      }
    })
    return instance
  })

  app.get('/:id/qr', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })
    const { data } = await evolutionApi.get(`/instance/connect/${instance.name}`)
    return data
  })

  app.get('/:id/status', async (req) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    return { status: instance?.status }
  })

  app.delete('/:id', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })
    await evolutionApi.delete(`/instance/delete/${instance.name}`)
    await prisma.waInstance.delete({ where: { id: instance.id } })
    return { deleted: true }
  })
}
