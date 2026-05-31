import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const WSContext = createContext(null)

export function WSProvider({ children }) {
  const { user } = useAuth()
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef({})
  const retryTimer = useRef(null)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false
    if (!user) return

    function connect() {
      if (unmounted.current) return
      const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`
      const socket = new WebSocket(url)
      ws.current = socket

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', tenantId: user.tenantId }))
        setConnected(true)
        if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
      }

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          const fns = listeners.current[msg.event] || []
          fns.forEach(fn => fn(msg.data))
        } catch {}
      }

      socket.onclose = () => {
        setConnected(false)
        if (!unmounted.current) {
          retryTimer.current = setTimeout(connect, 4000)
        }
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      unmounted.current = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
      ws.current?.close()
    }
  }, [user])

  function on(event, fn) {
    if (!listeners.current[event]) listeners.current[event] = []
    listeners.current[event].push(fn)
    return () => {
      listeners.current[event] = listeners.current[event].filter(f => f !== fn)
    }
  }

  return (
    <WSContext.Provider value={{ connected, on }}>
      {children}
    </WSContext.Provider>
  )
}

export const useWS = () => useContext(WSContext)
