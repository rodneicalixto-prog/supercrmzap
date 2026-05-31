import axios from 'axios'

export const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  headers: {
    apikey: process.env.EVOLUTION_API_KEY || '',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

evolutionApi.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || err.message
    console.error(`[Evolution API] ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${msg}`)
    return Promise.reject(err)
  }
)

export async function criarInstancia(nomeInstancia, webhookUrl) {
  return evolutionApi.post('/instance/create', {
    instanceName: nomeInstancia,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    webhook: {
      url: webhookUrl,
      byEvents: true,
      base64: true,
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
        'MESSAGES_UPDATE',
      ],
    },
    settings: {
      rejectCall: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
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

export async function enviarTexto(nomeInstancia, numero, texto) {
  return evolutionApi.post(`/message/sendText/${nomeInstancia}`, {
    number: numero,
    text: texto,
  })
}

export async function enviarMidia(nomeInstancia, numero, { tipo, url, legenda }) {
  return evolutionApi.post(`/message/sendMedia/${nomeInstancia}`, {
    number: numero,
    mediatype: tipo,
    media: url,
    caption: legenda,
  })
}
