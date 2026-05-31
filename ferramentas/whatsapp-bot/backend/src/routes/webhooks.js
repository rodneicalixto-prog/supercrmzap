import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'
import axios from 'axios'

export default async function webhookRoutes(app) {

  // ── Receiver da Evolution Go ─────────────────────────────────────────────
  app.post('/evolution/:userId', async (req) => {
    const { event, data, instance } = req.body
    const userId = req.params.userId

    // Mensagem recebida
    if (event === 'messages.upsert') {
      const { key, message, pushName } = data
      if (key.fromMe) return { recebido: true } // ignora eco de mensagens enviadas

      const telefone = key.remoteJid?.replace('@s.whatsapp.net', '')
      if (!telefone) return { recebido: true }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return { recebido: true }

      // Auto-salvar contato desconhecido
      let contato = await prisma.contact.findFirst({
        where: { tenantId: user.tenantId, phone: telefone },
      })
      if (!contato) {
        contato = await prisma.contact.create({
          data: {
            tenantId: user.tenantId,
            name: pushName || telefone,
            phone: telefone,
            autoSaved: true,
            source: 'whatsapp',
          },
        })
      }

      // Recuperar instância pelo instanceName retornado pela Evolution Go
      const instancia = await prisma.waInstance.findFirst({
        where: { tenantId: user.tenantId, userId },
      })

      // Criar ou recuperar conversa ativa
      let conversa = await prisma.conversation.findFirst({
        where: { tenantId: user.tenantId, contactId: contato.id, status: { in: ['open', 'pending'] } },
      })
      if (!conversa && instancia) {
        conversa = await prisma.conversation.create({
          data: {
            tenantId: user.tenantId,
            instanceId: instancia.id,
            contactId: contato.id,
            status: 'open',
          },
        })
      }

      // Salvar mensagem
      const conteudo = message?.conversation || message?.extendedTextMessage?.text || ''
      if (conversa) {
        const msg = await prisma.message.create({
          data: {
            conversationId: conversa.id,
            direction: 'in',
            type: 'text',
            content: conteudo,
            externalId: key.id,
          },
        })
        broadcast(user.tenantId, {
          event: 'nova_mensagem',
          data: { conversationId: conversa.id, mensagem: msg, contato },
        })
      }

      // Repassar para n8n se configurado
      if (process.env.N8N_WEBHOOK_URL) {
        axios.post(process.env.N8N_WEBHOOK_URL, req.body).catch(() => {})
      }
    }

    // Atualização de estado da conexão / QR Code
    if (event === 'connection.update' || event === 'qrcode.updated') {
      const estado = data?.state || data?.connection
      const qr = data?.qr || data?.qrcode?.base64

      const instancia = await prisma.waInstance.findFirst({
        where: { userId },
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

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user) {
        broadcast(user.tenantId, {
          event: 'status_instancia',
          data: {
            instanceId: instancia.id,
            status: novoStatus,
            qr_code: qr ? `data:image/png;base64,${qr}` : null,
          },
        })
      }
    }

    return { recebido: true }
  })

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
