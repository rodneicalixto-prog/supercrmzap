// Mapa de conexões: tenantId → Set de WebSockets
const rooms = new Map()

export function wsHandler(connection, req) {
  let tenantId = null

  connection.socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw)
      if (msg.type === 'auth' && msg.tenantId) {
        tenantId = msg.tenantId
        if (!rooms.has(tenantId)) rooms.set(tenantId, new Set())
        rooms.get(tenantId).add(connection.socket)
        connection.socket.send(JSON.stringify({ event: 'auth_ok' }))
      }
    } catch {}
  })

  connection.socket.on('close', () => {
    if (tenantId && rooms.has(tenantId)) {
      rooms.get(tenantId).delete(connection.socket)
    }
  })
}

export function broadcast(tenantId, payload) {
  const clients = rooms.get(tenantId)
  if (!clients) return
  const msg = JSON.stringify(payload)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}
