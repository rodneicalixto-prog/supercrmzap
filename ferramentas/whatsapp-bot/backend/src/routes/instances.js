import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { criarInstancia, obterQrCode, deletarInstancia, statusInstancia } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function instanceRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    return prisma.waInstance.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Criar instância — salva no banco imediatamente, tenta Evolution API em segundo plano
  app.post('/', async (req, reply) => {
    const { name } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'Nome da instância é obrigatório' })

    const nomeInterno = `t${req.user.tenantId.slice(0, 8)}_${name.trim().replace(/\s+/g, '_').toLowerCase()}`
    const webhookUrl = `${process.env.API_URL}/webhook/evolution/${req.user.id}`

    const instance = await prisma.waInstance.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        name: name.trim(),
        nomeInterno,
        status: 'desconectado',
        webhookUrl,
      },
    })

    // Tenta criar na Evolution API sem bloquear a resposta
    criarInstancia(nomeInterno, webhookUrl).catch(err => {
      console.error(`[instância ${nomeInterno}] Falha ao registrar na Evolution API: ${err.message}`)
    })

    return reply.status(201).send(instance)
  })

  // Conectar — chama Evolution API e retorna QR
  app.post('/:id/connect', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    const nome = instance.nomeInterno || instance.name

    // Garante que a instância existe na Evolution API
    try {
      await criarInstancia(nome, instance.webhookUrl)
    } catch (err) {
      // Pode já existir — ignora erro 409 ou similar
      if (!err.response || err.response.status !== 409) {
        console.warn(`[connect] Aviso ao criar na Evolution: ${err.message}`)
      }
    }

    try {
      const { data } = await obterQrCode(nome)
      console.log(`[connect QR] resposta Evolution API para ${nome}:`, JSON.stringify(data))

      // Extrai base64 em todos os formatos retornados pela Evolution API v2
      const qrBase64 = data?.base64
        || data?.qrcode?.base64
        || data?.code
        || (typeof data === 'string' ? data : null)

      await prisma.waInstance.update({
        where: { id: instance.id },
        data: { status: 'aguardando_qr' },
      })
      broadcast(req.user.tenantId, {
        event: 'status_instancia',
        data: { instanceId: instance.id, status: 'aguardando_qr', qr_code: qrBase64 },
      })
      return { ...data, _qr: qrBase64 }
    } catch (err) {
      console.error(`[connect QR] erro para ${nome}:`, err.response?.data || err.message)
      return reply.status(502).send({ error: 'Não foi possível obter o QR Code. Evolution API inacessível.', detalhe: err.response?.data?.message || err.message })
    }
  })

  // QR Code (alias legado)
  app.get('/:id/qr', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })
    try {
      const { data } = await obterQrCode(instance.nomeInterno || instance.name)
      return data
    } catch {
      return reply.status(502).send({ error: 'Não foi possível obter o QR Code.' })
    }
  })

  // Status
  app.get('/:id/status', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })

    // Atualiza status via Evolution API se possível
    try {
      const { data } = await statusInstancia(instance.nomeInterno || instance.name)
      const estado = data?.instance?.state
      const novoStatus = estado === 'open' ? 'conectado'
        : estado === 'close' ? 'desconectado'
        : instance.status
      if (novoStatus !== instance.status) {
        await prisma.waInstance.update({ where: { id: instance.id }, data: { status: novoStatus } })
      }
      return { status: novoStatus, telefone: instance.phone }
    } catch {
      return { status: instance.status, telefone: instance.phone }
    }
  })

  // Remover
  app.delete('/:id', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })

    deletarInstancia(instance.nomeInterno || instance.name).catch(() => {})
    await prisma.waInstance.delete({ where: { id: instance.id } })
    broadcast(req.user.tenantId, { event: 'instancia_removida', data: { id: instance.id } })
    return { removido: true }
  })
}
