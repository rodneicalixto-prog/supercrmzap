import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'

export default function RedefinirSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha deve ter no mínimo 8 caracteres.')
    if (senha !== confirmacao) return setErro('As senhas não coincidem.')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: senha })
      navigate('/login?redefinida=1')
    } catch {
      setErro('Link inválido ou expirado. Solicite um novo link de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400">Link inválido.</p>
          <a href="/forgot-password" className="text-sm text-gray-400 hover:text-white mt-2 block">
            Solicitar novo link
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">⚡ SOS Super MKT</h1>
          <p className="text-gray-400 text-sm mt-1">Redefinição de senha</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              required
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
