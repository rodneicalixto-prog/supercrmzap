import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'
import axios from 'axios'

export default async function webhookRoutes(app) {

  // ── Receiver da Evolution API v2 ─────────────────────────────────────────
  // A Evolution API v2 envia para {webhookUrl}/{event-em-kebab-case}
  // Ex: POST /webhook/evolution/messages-upsert
  //     POST /webhook/evolution/connection-update
  // O nome da instância vem no body como `instance`

  async function handleEvolution(req, reply) {
    const body = req.body || {}
    const event = (body.event || '').toUpperCase().replace(/[.\-]/g, '_')
    const instanceName = body.instance // nomeInterno da Evolution API

    if (!instanceName) return { recebido: true }

    // Mensagens recebidas
    if (event === 'MESSAGES_UPSERT') {
      const data = body.data || {}
      const { key, message, pushName } = data
      if (!key || key.fromMe) return { recebido: true }

      const telefone = key.remoteJid?.replace('@s.whatsapp.net', '')
      if (!telefone || telefone.includes('@g.us')) return { recebido: true } // ignora grupos

      const instancia = await prisma.waInstance.findFirst({
        where: { nomeInterno: instanceName },
        include: { user: true },
      })
      if (!instancia) return { recebido: true }

      const { tenantId } = instancia

      // Auto-salvar contato
      let contato = await prisma.contact.findFirst({
        where: { tenantId, phone: telefone },
      })
      if (!contato) {
        contato = await prisma.contact.create({
          data: {
            tenantId,
            name: pushName || telefone,
            phone: telefone,
            autoSaved: true,
            source: 'whatsapp',
          },
        })
      } else if (pushName && contato.name === contato.phone) {
        await prisma.contact.update({ where: { id: contato.id }, data: { name: pushName } })
        contato.name = pushName
      }

      // Criar ou recuperar conversa ativa
      let conversa = await prisma.conversation.findFirst({
        where: { tenantId, contactId: contato.id, status: { in: ['open', 'pending'] } },
      })
      if (!conversa) {
        conversa = await prisma.conversation.create({
          data: {
            tenantId,
            userId: instancia.userId,
            instanceId: instancia.id,
            contactId: contato.id,
            status: 'open',
          },
        })
      }

      // Salvar mensagem
      const conteudo = message?.conversation
        || message?.extendedTextMessage?.text
        || message?.imageMessage?.caption
        || '[mídia]'

      const msg = await prisma.message.create({
        data: {
          conversationId: conversa.id,
          direction: 'in',
          type: 'text',
          content: conteudo,
          externalId: key.id,
        },
      })

      broadcast(tenantId, {
        event: 'nova_mensagem',
        data: { conversationId: conversa.id, mensagem: msg, contato },
      })

      if (process.env.N8N_WEBHOOK_URL) {
        axios.post(process.env.N8N_WEBHOOK_URL, body).catch(() => {})
      }
    }

    // Atualização de conexão / QR
    if (event === 'CONNECTION_UPDATE' || event === 'QRCODE_UPDATED') {
      const data = body.data || {}
      console.log(`[webhook ${event}] data:`, JSON.stringify(data).slice(0, 300))
      const estado = data.state || data.connection
      const qrRaw = data.qr || data.qrcode?.base64 || data.qrcode
      const qr = typeof qrRaw === 'string' && qrRaw.startsWith('data:') ? qrRaw.split(',')[1] : qrRaw

      const instancia = await prisma.waInstance.findFirst({
        where: { nomeInterno: instanceName },
      })
      if (!instancia) return { recebido: true }

      let novoStatus = instancia.status
      if (estado === 'open') novoStatus = 'conectado'
      else if (estado === 'close' || estado === 'refused') novoStatus = 'desconectado'
      else if (qr) novoStatus = 'aguardando_qr'

      await prisma.waInstance.update({
        where: { id: instancia.id },
        data: {
          status: novoStatus,
          ...(estado === 'open' && data?.me?.id
            ? { phone: data.me.id.replace('@s.whatsapp.net', '') }
            : {}),
        },
      })

      broadcast(instancia.tenantId, {
        event: 'status_instancia',
        data: {
          instanceId: instancia.id,
          status: novoStatus,
          qr_code: qr ? `data:image/png;base64,${qr}` : null,
        },
      })
    }

    return { recebido: true }
  }

  // Rota legada (com userId no path)
  app.post('/evolution/:userId', handleEvolution)

  // Rotas v2 da Evolution API (event no path)
  app.post('/evolution/messages-upsert', handleEvolution)
  app.post('/evolution/messages-update', handleEvolution)
  app.post('/evolution/connection-update', handleEvolution)
  app.post('/evolution/qrcode-updated', handleEvolution)
  app.post('/evolution/send-message', handleEvolution)

  // ── Receiver do Asaas (Pagamentos) ───────────────────────────────────────
  app.post('/asaas', async (req) => {
    const { event, payment } = req.body

    if (event === 'PAYMENT_RECEIVED' || event === 'SUBSCRIPTION_RENEWED') {
      const sub = await prisma.subscription.findFirst({
        where: { asaasCustomerId: payment?.customer },
      })
      if (sub) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'ativa' } })
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'ativo' } })
      }
    }

    if (event === 'PAYMENT_OVERDUE') {
      const sub = await prisma.subscription.findFirst({
        where: { asaasCustomerId: payment?.customer },
      })
      if (sub) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'vencida' } })
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'suspenso' } })
      }
    }

    return { recebido: true }
  })
}
