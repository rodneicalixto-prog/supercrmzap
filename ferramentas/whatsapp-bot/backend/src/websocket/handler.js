// Mapa de conexões: tenantId → Set de WebSockets
const rooms = new Map()

export function wsHandler(connection, req) {
  // @fastify/websocket v7+ passa o socket diretamente como connection
  // versões anteriores passam connection.socket
  const socket = connection.socket ?? connection

  if (!socket || typeof socket.on !== 'function') {
    console.error('[WS] socket inválido na conexão')
    return
  }

  let tenantId = null

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw)
      if (msg.type === 'auth' && msg.tenantId) {
        tenantId = msg.tenantId
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
