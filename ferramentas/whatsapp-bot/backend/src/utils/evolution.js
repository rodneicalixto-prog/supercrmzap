import axios from 'axios'

export const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  headers: { apikey: process.env.EVOLUTION_API_KEY || '' }
})
