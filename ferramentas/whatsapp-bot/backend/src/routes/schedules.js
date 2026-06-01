import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { enviarTexto } from '../utils/evolution.js'

export default async function scheduleRoutes(app) {
  app.addHook('preHandler', authenticate)

  // Listar agendamentos
  app.get('/', async (req) => {
    return prisma.schedule.findMany({
      where: { tenantId: req.user.tenantId, userId: req.user.id },
      orderBy: { scheduledAt: 'asc' },
    })
  })

  // Criar agendamento de mensagem
  app.post('/', async (req, reply) => {
    const { instanceId, phone, message, scheduledAt, mediaUrl, mediaType } = req.body
    if (!phone || !scheduledAt) {
      return reply.status(400).send({ error: 'Telefone e data/hora são obrigatórios' })
    }
    if (!message && !mediaUrl) {
      return reply.status(400).send({ error: 'Informe uma mensagem ou anexo' })
    }

    const instancia = await prisma.waInstance.findFirst({
      where: { id: instanceId, tenantId: req.user.tenantId },
    })
    if (!instancia) return reply.status(404).send({ error: 'Instância não encontrada' })

    return prisma.schedule.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        instanceId,
        phone,
        message: message || '',
        scheduledAt: new Date(scheduledAt),
        status: 'pending',
        ...(mediaUrl && { mediaUrl, mediaType: mediaType || 'document' }),
      },
    })
  })

  // Cancelar agendamento
  app.delete('/:id', async (req, reply) => {
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (!schedule) return reply.status(404).send({ error: 'Agendamento não encontrado' })
    if (schedule.status === 'sent') return reply.status(409).send({ error: 'Mensagem já enviada, não é possível cancelar' })
    await prisma.schedule.delete({ where: { id: req.params.id } })
    return { cancelado: true }
  })
}
