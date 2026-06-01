import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'
import axios from 'axios'
import QRCode from 'qrcode'

export default async function webhookRoutes(app) {

  // ── Receiver da Evolution API v2 ─────────────────────────────────────────
  // A Evolution API v2 envia para {webhookUrl}/{event-em-kebab-case}
  // Ex: POST /webhook/evolution/messages-upsert
  //     POST /webhook/evolution/connection-update
  // O nome da instância vem no body como `instance`

  async function handleEvolution(req, reply) {
    // Verificação de secret — protege contra injeção de eventos externos
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET
    if (secret && req.headers['apikey'] !== secret) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

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

      // Auto-salvar contato — upsert atômico evita duplicatas em concorrência
      let contato = await prisma.contact.upsert({
        where: { tenantId_phone: { tenantId, phone: telefone } },
        create: {
          tenantId,
          name: pushName || telefone,
          phone: telefone,
          autoSaved: true,
          source: 'whatsapp',
        },
        update: {
          ...(pushName ? { name: pushName } : {}),
        },
      })

      // Criar ou recuperar conversa ativa — findFirst + create ainda necessário pois
      // não há unique constraint em (tenantId, contactId, status)
      let conversa = await prisma.conversation.findFirst({
        where: { tenantId, contactId: contato.id, status: { in: ['open', 'pending'] } },
      })
      if (!conversa) {
        try {
          conversa = await prisma.conversation.create({
            data: {
              tenantId,
              userId: instancia.userId,
              instanceId: instancia.id,
              contactId: contato.id,
              status: 'open',
            },
          })
        } catch {
          // Corrida: outra req criou antes — busca novamente
          conversa = await prisma.conversation.findFirst({
            where: { tenantId, contactId: contato.id, status: { in: ['open', 'pending'] } },
          })
          if (!conversa) return { recebido: true }
        }
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

      // Notificar assinantes da conversa (para filtragem no frontend)
      const assinantes = await prisma.conversationSubscriber.findMany({
        where: { conversationId: conversa.id },
        select: { userId: true },
      })
      if (assinantes.length > 0) {
        broadcast(tenantId, {
          event: 'nova_mensagem_assinada',
          data: { conversationId: conversa.id, mensagem: msg, contato, assinantes: assinantes.map(a => a.userId) },
        })
      }

      // ── Dispatch webhooks: prioridade usuário atribuído > instância > global ──
      // Carrega webhooks do atendente responsável pela conversa (se houver)
      let atendente = null
      if (conversa.userId) {
        atendente = await prisma.user.findUnique({
          where: { id: conversa.userId },
          select: { n8nWebhookUrl: true, openaiApiKey: true, openaiWebhook: true },
        })
      }

      const payloadOpenAI = {
        phone: telefone,
        name: contato.name,
        message: conteudo,
        conversationId: conversa.id,
        instanceName,
        attendantId: conversa.userId || null,
      }

      // n8n: atendente → instância → env global
      const n8nUrl = atendente?.n8nWebhookUrl || instancia.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL
      if (n8nUrl) axios.post(n8nUrl, body).catch(err => console.error(`[webhook n8n] falha ao enviar para ${n8nUrl}: ${err.message}`))

      // OpenAI/custom: atendente → instância
      const openaiUrl = atendente?.openaiWebhook || instancia.openaiWebhook
      const openaiKey = atendente?.openaiApiKey || instancia.openaiApiKey
      if (openaiUrl) {
        axios.post(openaiUrl, {
          ...payloadOpenAI,
          ...(openaiKey && { apiKey: openaiKey }),
        }).catch(err => console.error(`[webhook openai] falha ao enviar para ${openaiUrl}: ${err.message}`))
      }
    }

    // Atualização de conexão / QR
    if (event === 'CONNECTION_UPDATE' || event === 'QRCODE_UPDATED') {
      const data = body.data || {}
      console.log(`[webhook ${event}] data:`, JSON.stringify(data).slice(0, 300))
      const estado = data.state || data.connection

      // Evolution API v2 envia QR como código bruto em data.qrcode.code
      // Precisamos gerar o PNG a partir deste código
      const qrCode = data.qrcode?.code || data.qr
      let qr = data.qrcode?.base64 // base64 PNG pronto (se vier)
      if (!qr && qrCode && typeof qrCode === 'string') {
        try {
          // Gera PNG base64 a partir do código bruto do QR
          const pngDataUrl = await QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
          qr = pngDataUrl.split(',')[1] // remove prefixo "data:image/png;base64,"
        } catch (e) {
          console.error('[webhook QR] erro ao gerar QR PNG:', e.message)
        }
      } else if (qr && qr.startsWith('data:')) {
        qr = qr.split(',')[1]
      }

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
  app.post('/asaas', async (req, reply) => {
    // Verifica token de acesso do Asaas
    const asaasToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (asaasToken && req.headers['asaas-access-token'] !== asaasToken) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

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
