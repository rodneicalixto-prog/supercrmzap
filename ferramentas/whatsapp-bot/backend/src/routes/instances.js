import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { criarInstancia, obterQrCode, deletarInstancia } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function instanceRoutes(app) {
  app.addHook('preHandler', authenticate)

  // Listar instâncias do usuário
  app.get('/', async (req) => {
    return prisma.waInstance.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Criar nova instância
  app.post('/', async (req, reply) => {
    const { name } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'Nome da instância é obrigatório' })

    const nomeInterno = `${req.user.tenantId}_${name.trim().replace(/\s+/g, '_').toLowerCase()}`
    const webhookUrl = `${process.env.API_URL}/webhook/evolution/${req.user.id}`

    try {
      await criarInstancia(nomeInterno, webhookUrl)
    } catch (err) {
      return reply.status(502).send({ error: 'Falha ao criar instância na Evolution Go', detalhe: err.message })
    }

    const instance = await prisma.waInstance.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        name,
        nomeInterno,
        status: 'desconectado',
        webhookUrl,
      },
    })
    return reply.status(201).send(instance)
  })

  // Obter QR Code para conectar
  app.get('/:id/qr', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    try {
      const { data } = await obterQrCode(instance.nomeInterno || instance.name)
      return data
    } catch {
      return reply.status(502).send({ error: 'Não foi possível obter o QR Code. Verifique se a instância está ativa na Evolution Go.' })
    }
  })

  // Status de conexão
  app.get('/:id/status', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })
    return { status: instance.status, telefone: instance.phone }
  })

  // Remover instância
  app.delete('/:id', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })

    try {
      await deletarInstancia(instance.nomeInterno || instance.name)
    } catch {
      // Não bloqueia a remoção local mesmo se a Evolution Go falhar
    }

    await prisma.waInstance.delete({ where: { id: instance.id } })
    broadcast(req.user.tenantId, { event: 'instancia_removida', data: { id: instance.id } })
    return { removido: true }
  })
}
