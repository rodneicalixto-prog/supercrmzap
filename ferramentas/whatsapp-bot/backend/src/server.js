import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { createWriteStream, mkdirSync } from 'fs'
import { pipeline } from 'stream/promises'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

import authRoutes from './routes/auth.js'
import instanceRoutes from './routes/instances.js'
import conversationRoutes from './routes/conversations.js'
import messageRoutes from './routes/messages.js'
import contactRoutes from './routes/contacts.js'
import kanbanRoutes from './routes/kanban.js'
import scheduleRoutes from './routes/schedules.js'
import webhookRoutes from './routes/webhooks.js'
import userRoutes from './routes/users.js'
import tenantRoutes from './routes/tenants.js'
import logsRoutes from './routes/logs.js'
import queuesRoutes from './routes/queues.js'
import academyRoutes from './routes/academy.js'
import { wsHandler } from './websocket/handler.js'

const app = Fastify({ logger: true })

const allowedOrigins = [
  'https://supercrmapp.openwave.online',
  'http://localhost:5173',
  'http://localhost:3000',
]

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Origem não permitida pelo CORS'), false)
  },
  credentials: true,
})

await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Muitas requisições. Tente novamente em instantes.' }),
})

await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' })
await app.register(websocket)
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB

// Servir uploads estaticamente
const uploadsDir = join(__dirname, '..', 'uploads')
mkdirSync(uploadsDir, { recursive: true })
await app.register(staticFiles, { root: uploadsDir, prefix: '/uploads/' })

// WebSocket
app.register(async function (f) {
  f.get('/ws', { websocket: true }, wsHandler)
})

// Rotas públicas
app.register(authRoutes, { prefix: '/auth' })
app.register(webhookRoutes, { prefix: '/webhook' })

// Rotas protegidas por JWT
app.register(instanceRoutes,     { prefix: '/instances' })
app.register(conversationRoutes, { prefix: '/conversations' })
app.register(messageRoutes,      { prefix: '/messages' })
app.register(contactRoutes,      { prefix: '/contacts' })
app.register(kanbanRoutes,       { prefix: '/kanban' })
app.register(scheduleRoutes,     { prefix: '/schedules' })
app.register(userRoutes,         { prefix: '/users' })
app.register(tenantRoutes,       { prefix: '/tenants' })
app.register(logsRoutes,         { prefix: '/logs' })
app.register(queuesRoutes,       { prefix: '/queues' })
app.register(academyRoutes,      { prefix: '/academy' })

// Upload de arquivo (retorna URL pública)
import { authenticate } from './middlewares/auth.js'
app.post('/upload', { preHandler: authenticate }, async (req, reply) => {
  const data = await req.file()
  if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })
  const ext = extname(data.filename) || '.bin'
  const nome = `${randomUUID()}${ext}`
  const destino = join(uploadsDir, nome)
  await pipeline(data.file, createWriteStream(destino))
  const url = `${process.env.API_URL}/uploads/${nome}`
  return { url, filename: data.filename, mimetype: data.mimetype }
})

app.get('/health', () => ({ status: 'ok', ambiente: process.env.NODE_ENV, ts: new Date() }))

try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
