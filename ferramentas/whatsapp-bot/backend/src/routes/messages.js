import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'
import { enviarTexto, enviarMidia } from '../utils/evolution.js'
import { broadcast } from '../websocket/handler.js'

export default async function messageRoutes(app) {
  app.addHook('preHandler', authenticate)

  // Enviar mensagem de texto
  app.post('/texto', async (req, reply) => {
    const { conversationId, conteudo } = req.body
    if (!conteudo?.trim()) return reply.status(400).send({ error: 'Conteúdo da mensagem é obrigatório' })

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: req.user.tenantId },
      include: { instance: true, contact: true },
    })
    if (!conv) return reply.status(404).send({ error: 'Conversa não encontrada' })

    await enviarTexto(conv.instance.nomeInterno || conv.instance.name, conv.contact.phone, conteudo)

    const msg = await prisma.message.create({
      data: { conversationId, direction: 'out', type: 'text', content: conteudo },
    })

    broadcast(req.user.tenantId, { event: 'nova_mensagem', data: { conversationId, mensagem: msg } })
    return msg
  })

  // Enviar mídia (imagem, vídeo, áudio, documento)
  app.post('/midia', async (req, reply) => {
    const { conversationId, mediaUrl, tipo, legenda } = req.body

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: req.user.tenantId },
      include: { instance: true, contact: true },
    })
    if (!conv) return reply.status(404).send({ error: 'Conversa não encontrada' })

    await enviarMidia(conv.instance.nomeInterno || conv.instance.name, conv.contact.phone, {
      tipo: tipo || 'image',
      url: mediaUrl,
      legenda,
    })

    const msg = await prisma.message.create({
      data: { conversationId, direction: 'out', type: tipo || 'image', mediaUrl },
    })

    broadcast(req.user.tenantId, { event: 'nova_mensagem', data: { conversationId, mensagem: msg } })
    return msg
  })
}
