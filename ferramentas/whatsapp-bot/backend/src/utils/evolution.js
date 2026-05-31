import axios from 'axios'

// Cliente HTTP pré-configurado para a Evolution Go API
export const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  headers: {
    apikey: process.env.EVOLUTION_API_KEY || '',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Interceptor: loga erros de comunicação com a Evolution Go sem quebrar o fluxo
evolutionApi.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || err.message
    console.error(`[Evolution Go] ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${msg}`)
    return Promise.reject(err)
  }
)

// ── Helpers de instância ─────────────────────────────────────────────────────

export async function criarInstancia(nomeInstancia, webhookUrl) {
  return evolutionApi.post('/instance/create', {
    instanceName: nomeInstancia,
    webhook: {
      url: webhookUrl,
      byEvents: true,
      events: [
        'messages.upsert',
        'connection.update',
        'qrcode.updated',
        'messages.update',
      ],
    },
    settings: {
      rejectCall: false,
      readMessages: false,
      readStatus: false,
    },
  })
}

export async function obterQrCode(nomeInstancia) {
  return evolutionApi.get(`/instance/connect/${nomeInstancia}`)
}

export async function deletarInstancia(nomeInstancia) {
  return evolutionApi.delete(`/instance/delete/${nomeInstancia}`)
}

export async function statusInstancia(nomeInstancia) {
  return evolutionApi.get(`/instance/connectionState/${nomeInstancia}`)
}

// ── Helpers de mensagem ──────────────────────────────────────────────────────

export async function enviarTexto(nomeInstancia, numero, texto) {
  return evolutionApi.post(`/message/sendText/${nomeInstancia}`, {
    number: numero,
    text: texto,
  })
}

export async function enviarMidia(nomeInstancia, numero, { tipo, url, legenda }) {
  return evolutionApi.post(`/message/sendMedia/${nomeInstancia}`, {
    number: numero,
    mediatype: tipo,   // image | video | audio | document
    media: url,
    caption: legenda,
  })
}
