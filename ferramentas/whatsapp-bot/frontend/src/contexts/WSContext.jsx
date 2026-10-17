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
  const retryCount = useRef(0)

  useEffect(() => {
    unmounted.current = false
    if (!user) return

    function connect() {
      if (unmounted.current) return
      const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`
      const socket = new WebSocket(url)
      ws.current = socket

      socket.onopen = () => {
        const token = localStorage.getItem('token')
        socket.send(JSON.stringify({ type: 'auth', token }))
        setConnected(true)
        retryCount.current = 0
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
          // Backoff exponencial com jitter: 2s, 4s, 8s, ... até 60s
          const delay = Math.min(2000 * Math.pow(2, retryCount.current), 60000)
          const jitter = Math.random() * 1000
          retryCount.current++
          retryTimer.current = setTimeout(connect, delay + jitter)
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
