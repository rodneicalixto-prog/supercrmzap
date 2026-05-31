import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { evolutionApi } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function messageRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.post('/text', async (req) => {
    const { conversationId, content } = req.body
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: req.user.tenantId },
      include: { instance: true, contact: true }
    })
    await evolutionApi.post(`/message/sendText/${conv.instance.name}`, {
      number: conv.contact.phone,
      text: content
    })
    const msg = await prisma.message.create({
      data: { conversationId, direction: 'out', type: 'text', content }
    })
    broadcast(req.user.tenantId, { event: 'new_message', data: { conversationId, message: msg } })
    return msg
  })

  app.post('/media', async (req) => {
    const { conversationId, mediaUrl, type, caption } = req.body
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: req.user.tenantId },
      include: { instance: true, contact: true }
    })
    await evolutionApi.post(`/message/sendMedia/${conv.instance.name}`, {
      number: conv.contact.phone,
      mediatype: type,
      media: mediaUrl,
      caption
    })
    const msg = await prisma.message.create({
      data: { conversationId, direction: 'out', type, mediaUrl }
    })
    broadcast(req.user.tenantId, { event: 'new_message', data: { conversationId, message: msg } })
    return msg
  })
}
