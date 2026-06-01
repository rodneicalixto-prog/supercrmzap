import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { criarInstancia, obterQrCode, deletarInstancia, statusInstancia, evolutionApi } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function instanceRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    return prisma.waInstance.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Criar instância
  app.post('/', async (req, reply) => {
    const { name, n8nWebhookUrl, openaiApiKey, openaiWebhook } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'Nome da instância é obrigatório' })

    const nomeInterno = `t${req.user.tenantId.slice(0, 8)}_${name.trim().replace(/\s+/g, '_').toLowerCase()}`
    const webhookUrl = `${process.env.API_URL}/webhook/evolution`

    const instance = await prisma.waInstance.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        name: name.trim(),
        nomeInterno,
        status: 'desconectado',
        webhookUrl,
        ...(n8nWebhookUrl && { n8nWebhookUrl }),
        ...(openaiApiKey && { openaiApiKey }),
        ...(openaiWebhook && { openaiWebhook }),
      },
    })

    criarInstancia(nomeInterno, webhookUrl).catch(err => {
      console.error(`[instância ${nomeInterno}] Falha ao registrar na Evolution API: ${err.message}`)
    })

    return reply.status(201).send(instance)
  })

  // Atualizar configurações da instância
  app.put('/:id', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Não encontrada' })
    const { n8nWebhookUrl, openaiApiKey, openaiWebhook } = req.body
    const data = {}
    if (n8nWebhookUrl !== undefined) data.n8nWebhookUrl = n8nWebhookUrl || null
    if (openaiApiKey !== undefined) data.openaiApiKey = openaiApiKey || null
    if (openaiWebhook !== undefined) data.openaiWebhook = openaiWebhook || null
    return prisma.waInstance.update({ where: { id: req.params.id }, data })
  })

  // Conectar — chama Evolution API e retorna QR
  app.post('/:id/connect', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    const nome = instance.nomeInterno || instance.name
    const webhookUrl = `${process.env.API_URL}/webhook/evolution`

    // Atualiza webhook se necessário
    try {
      await evolutionApi.post(`/webhook/set/${nome}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          base64: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPDATE'],
        },
      })
    } catch {}

    // Tenta criar a instância (ignora se já existe)
    try {
      await criarInstancia(nome, webhookUrl)
    } catch (err) {
      if (err.response?.status !== 409 && err.response?.status !== 403) {
        console.warn(`[connect] criar instância: ${err.message}`)
      }
    }

    // Verifica se já está conectado
    try {
      const { data: statusData } = await statusInstancia(nome)
      console.log(`[connect] statusData de ${nome}:`, JSON.stringify(statusData))
      const estado = statusData?.instance?.state || statusData?.state || statusData?.connectionStatus
      console.log(`[connect] estado atual de ${nome}:`, estado)
      if (estado === 'open' || estado === 'connected') {
        await prisma.waInstance.update({
          where: { id: instance.id },
          data: { status: 'conectado', webhookUrl },
        })
        broadcast(req.user.tenantId, {
          event: 'status_instancia',
          data: { instanceId: instance.id, status: 'conectado', qr_code: null },
        })
        return { conectado: true, _qr: null }
      }
    } catch {}

    // Obtém QR Code
    try {
      const { data } = await obterQrCode(nome)
      console.log(`[connect QR] resposta para ${nome}:`, JSON.stringify(data).slice(0, 200))

      // data?.code é o dado bruto do QR (ex: "2@XYZ..."), não base64 de imagem — não usar como src
      const qrBase64 = data?.base64
        || data?.qrcode?.base64
        || (typeof data === 'string' && data.length > 100 ? data : null)

      await prisma.waInstance.update({
        where: { id: instance.id },
        data: { status: qrBase64 ? 'aguardando_qr' : instance.status, webhookUrl },
      })
      if (qrBase64) {
        broadcast(req.user.tenantId, {
          event: 'status_instancia',
          data: { instanceId: instance.id, status: 'aguardando_qr', qr_code: `data:image/png;base64,${qrBase64}` },
        })
      }
      return { _qr: qrBase64 ? `data:image/png;base64,${qrBase64}` : null }
    } catch (err) {
      console.error(`[connect QR] erro para ${nome}:`, err.response?.data || err.message)
      return reply.status(502).send({ error: 'Não foi possível obter o QR Code.', detalhe: err.response?.data?.message || err.message })
    }
  })

  // Desconectar instância (logout do WhatsApp)
  app.post('/:id/disconnect', async (req, reply) => {
    const instance = await prisma.waInstance.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    try {
      await evolutionApi.delete(`/instance/logout/${instance.nomeInterno || instance.name}`)
    } catch (err) {
      console.warn(`[disconnect] Evolution API: ${err.message}`)
    }

    await prisma.waInstance.update({
      where: { id: instance.id },
      data: { status: 'desconectado' },
    })
    broadcast(req.user.tenantId, {
      event: 'status_instancia',
      data: { instanceId: instance.id, status: 'desconectado', qr_code: null },
    })
    return { desconectado: true }
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
