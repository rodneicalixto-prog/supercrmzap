import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'

import authRoutes from './routes/auth.js'
import instanceRoutes from './routes/instances.js'
import conversationRoutes from './routes/conversations.js'
import messageRoutes from './routes/messages.js'
import contactRoutes from './routes/contacts.js'
import kanbanRoutes from './routes/kanban.js'
import scheduleRoutes from './routes/schedules.js'
import webhookRoutes from './routes/webhooks.js'
import userRoutes from './routes/users.js'
import { wsHandler } from './websocket/handler.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: process.env.FRONTEND_URL || '*' })
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' })
await app.register(websocket)

// WebSocket
app.register(async function (f) {
  f.get('/ws', { websocket: true }, wsHandler)
})

// Rotas públicas
app.register(authRoutes, { prefix: '/auth' })
app.register(webhookRoutes, { prefix: '/webhook' })

// Rotas protegidas
app.register(instanceRoutes,    { prefix: '/instances' })
app.register(conversationRoutes,{ prefix: '/conversations' })
app.register(messageRoutes,     { prefix: '/messages' })
app.register(contactRoutes,     { prefix: '/contacts' })
app.register(kanbanRoutes,      { prefix: '/kanban' })
app.register(scheduleRoutes,    { prefix: '/schedules' })
app.register(userRoutes,        { prefix: '/users' })

app.get('/health', () => ({ status: 'ok', ts: new Date() }))

try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
