import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000'
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
})

let refreshing = null

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        clearSession()
        return Promise.reject(err)
      }
      if (!refreshing) {
        refreshing = axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/refresh`,
          { refreshToken }
        ).then(r => {
          localStorage.setItem('token', r.data.token)
          localStorage.setItem('refreshToken', r.data.refreshToken)
          api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`
          return r.data.token
        }).catch(() => {
          clearSession()
          return null
        }).finally(() => { refreshing = null })
      }
      const newToken = await refreshing
      if (!newToken) return Promise.reject(err)
      original._retry = true
      original.headers['Authorization'] = `Bearer ${newToken}`
      return api(original)
    }
    return Promise.reject(err)
  }
)

function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  delete api.defaults.headers.common['Authorization']
  window.location.href = '/login'
}
