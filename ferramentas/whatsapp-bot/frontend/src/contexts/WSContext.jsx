import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const WSContext = createContext(null)

export function WSProvider({ children }) {
  const { user } = useAuth()
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef({})

  useEffect(() => {
    if (!user) return
    const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'auth', tenantId: user.tenantId }))
      setConnected(true)
    }

    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const fns = listeners.current[msg.event] || []
      fns.forEach(fn => fn(msg.data))
    }

    ws.current.onclose = () => setConnected(false)

    return () => ws.current?.close()
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
