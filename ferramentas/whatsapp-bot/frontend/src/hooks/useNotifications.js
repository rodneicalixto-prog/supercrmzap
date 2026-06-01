import { useCallback, useEffect, useRef, useState } from 'react'
import { useWS } from '../contexts/WSContext'

function tocarSom() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

export function useNotifications() {
  const [notificacoes, setNotificacoes] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const { on } = useWS()
  const paginaAtiva = useRef(true)

  useEffect(() => {
    const onFocus = () => { paginaAtiva.current = true }
    const onBlur  = () => { paginaAtiva.current = false }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    return on('nova_mensagem', (data) => {
      const contato = data.contato
      const texto = data.mensagem?.content || data.mensagem?.body || 'Nova mensagem'
      const nome = contato?.name || contato?.phone || 'Desconhecido'

      tocarSom()

      const notif = {
        id: Date.now(),
        conversationId: data.conversationId,
        nome,
        texto,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }

      setNotificacoes(n => [notif, ...n].slice(0, 20))
      setNaoLidas(c => c + 1)

      // Notificação nativa do browser se permitido e página em background
      if (!paginaAtiva.current && Notification.permission === 'granted') {
        new Notification(`Nova mensagem de ${nome}`, {
          body: texto,
          icon: '/favicon.ico',
          tag: data.conversationId,
        })
      }
    })
  }, [on])

  const limparNaoLidas = useCallback(() => setNaoLidas(0), [])
  const limparTodas = useCallback(() => { setNotificacoes([]); setNaoLidas(0) }, [])

  // Pedir permissão de notificação nativa ao montar
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return { notificacoes, naoLidas, limparNaoLidas, limparTodas }
}
