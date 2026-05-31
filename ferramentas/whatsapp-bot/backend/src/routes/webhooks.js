import { prisma } from '../utils/db.js'
import { broadcast } from '../websocket/handler.js'
import axios from 'axios'

export default async function webhookRoutes(app) {

  // Receiver da Evolution Go
  app.post('/evolution/:userId', async (req) => {
    const { event, data } = req.body
    const userId = req.params.userId

    if (event === 'messages.upsert') {
      const { key, message, pushName } = data
      const phone = key.remoteJid.replace('@s.whatsapp.net', '')

      // Auto-save de contato
      let contact = await prisma.contact.findFirst({ where: { phone } })
      if (!contact) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        contact = await prisma.contact.create({
          data: { tenantId: user.tenantId, name: pushName || phone, phone, autoSaved: true, source: 'whatsapp' }
        })
      }

      // Registra mensagem e emite via WebSocket
      const user = await prisma.user.findUnique({ where: { id: userId } })
      broadcast(user.tenantId, { event: 'new_message', data: { phone, content: message?.conversation, contact } })

      // Repassa para n8n
      if (process.env.N8N_WEBHOOK_URL) {
        axios.post(process.env.N8N_WEBHOOK_URL, req.body).catch(() => {})
      }
    }

    if (event === 'connection.update') {
      const { state, qr } = data
      const instance = await prisma.waInstance.findFirst({ where: { userId } })
      if (instance) {
        await prisma.waInstance.update({
          where: { id: instance.id },
          data: { status: state === 'open' ? 'connected' : qr ? 'qr' : 'disconnected' }
        })
        const user = await prisma.user.findUnique({ where: { id: userId } })
        broadcast(user.tenantId, { event: 'instance_status', data: { instanceId: instance.id, status: state, qr_code: qr } })
      }
    }

    return { received: true }
  })

  // Receiver do Asaas (pagamentos)
  app.post('/asaas', async (req) => {
    const { event, payment } = req.body
    if (event === 'PAYMENT_RECEIVED' || event === 'SUBSCRIPTION_RENEWED') {
      const sub = await prisma.subscription.findFirst({
        where: { asaasCustomerId: payment?.customer }
      })
      if (sub) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active' } })
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'active' } })
      }
    }
    if (event === 'PAYMENT_OVERDUE') {
      const sub = await prisma.subscription.findFirst({
        where: { asaasCustomerId: payment?.customer }
      })
      if (sub) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'overdue' } })
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'suspended' } })
      }
    }
    return { received: true }
  })
}
