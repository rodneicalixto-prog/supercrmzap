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
  const [piscando, setPiscando] = useState(false)
  const [somAtivo, setSomAtivo] = useState(() => {
    try { return localStorage.getItem('notif_som') !== 'false' } catch { return true }
  })
  const { on } = useWS()
  const paginaAtiva = useRef(true)
  const piscarTimer = useRef(null)

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

  function ativarPiscar() {
    setPiscando(true)
    clearTimeout(piscarTimer.current)
    // Para de piscar após 8 segundos ou quando o usuário clicar na campainha
    piscarTimer.current = setTimeout(() => setPiscando(false), 8000)
  }

  useEffect(() => {
    return on('nova_mensagem', (data) => {
      const contato = data.contato
      const texto = data.mensagem?.content || data.mensagem?.body || 'Nova mensagem'
      const nome = contato?.name || contato?.phone || 'Desconhecido'

      if (somAtivo) tocarSom()

      ativarPiscar()

      // Piscar título da aba
      let piscarTitulo = null
      const tituloOriginal = document.title
      let visible = true
      piscarTitulo = setInterval(() => {
        document.title = visible ? `🔔 Nova mensagem!` : tituloOriginal
        visible = !visible
      }, 800)
      setTimeout(() => {
        clearInterval(piscarTitulo)
        document.title = tituloOriginal
      }, 8000)

      const notif = {
        id: Date.now(),
        conversationId: data.conversationId,
        nome,
        texto,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }

      setNotificacoes(n => [notif, ...n].slice(0, 20))
      setNaoLidas(c => c + 1)

      if (!paginaAtiva.current && Notification.permission === 'granted') {
        new Notification(`Nova mensagem de ${nome}`, {
          body: texto,
          icon: '/favicon.ico',
          tag: data.conversationId,
        })
      }
    })
  }, [on, somAtivo])

  const toggleSom = useCallback(() => {
    setSomAtivo(v => {
      const novo = !v
      try { localStorage.setItem('notif_som', String(novo)) } catch {}
      return novo
    })
  }, [])

  const limparNaoLidas = useCallback(() => {
    setNaoLidas(0)
    setPiscando(false)
    clearTimeout(piscarTimer.current)
  }, [])

  const limparTodas = useCallback(() => {
    setNotificacoes([])
    setNaoLidas(0)
    setPiscando(false)
    clearTimeout(piscarTimer.current)
  }, [])

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return { notificacoes, naoLidas, piscando, somAtivo, toggleSom, limparNaoLidas, limparTodas }
}
