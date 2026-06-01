import { prisma } from '../utils/db.js'

// Mapa de conexões: tenantId → Set de WebSockets
const rooms = new Map()

// Heartbeat: detecta conexões zumbis a cada 30s
setInterval(() => {
  for (const [tenantId, clients] of rooms) {
    for (const ws of clients) {
      if (!ws.isAlive) {
        clients.delete(ws)
        ws.terminate?.()
        continue
      }
      ws.isAlive = false
      ws.ping?.()
    }
    if (clients.size === 0) rooms.delete(tenantId)
  }
}, 30_000)

export function wsHandler(connection, req) {
  const socket = connection.socket ?? connection

  if (!socket || typeof socket.on !== 'function') {
    console.error('[WS] socket inválido na conexão')
    return
  }

  socket.isAlive = true
  socket.on('pong', () => { socket.isAlive = true })

  let tenantId = null

  socket.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw)

      if (msg.type === 'auth' && msg.token) {
        // Valida JWT antes de admitir o cliente na sala
        let payload
        try {
          payload = req.server.jwt.verify(msg.token)
        } catch {
          socket.send(JSON.stringify({ event: 'auth_error', error: 'Token inválido' }))
          socket.close()
          return
        }

        // Verifica se o usuário ainda está ativo
        const user = await prisma.user.findFirst({
          where: { id: payload.id, status: 'active' },
          select: { id: true, tenantId: true },
        })
        if (!user) {
          socket.send(JSON.stringify({ event: 'auth_error', error: 'Usuário inativo' }))
          socket.close()
          return
        }

        tenantId = user.tenantId
        if (!rooms.has(tenantId)) rooms.set(tenantId, new Set())
        rooms.get(tenantId).add(socket)
        socket.send(JSON.stringify({ event: 'auth_ok' }))
      }
    } catch {}
  })

  socket.on('close', () => {
    if (tenantId && rooms.has(tenantId)) {
      rooms.get(tenantId).delete(socket)
    }
  })

  socket.on('error', (err) => {
    console.error('[WS] erro no socket:', err.message)
  })
}

export function broadcast(tenantId, payload) {
  const clients = rooms.get(tenantId)
  if (!clients) return
  const msg = JSON.stringify(payload)
  for (const ws of clients) {
    try {
      if (ws.readyState === 1) ws.send(msg)
    } catch {}
  }
}
