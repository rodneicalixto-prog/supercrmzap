import { useState } from 'react'
import { api } from '../services/api'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setEnviado(true)
    } catch {
      setErro('Não foi possível processar sua solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">⚡ SOS Super MKT</h1>
          <p className="text-gray-400 text-sm mt-1">Recuperação de senha</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {enviado ? (
            <div className="text-center space-y-3">
              <p className="text-3xl">📧</p>
              <p className="text-white font-medium">Verifique seu e-mail</p>
              <p className="text-sm text-gray-400">
                Se o endereço <strong className="text-gray-300">{email}</strong> estiver cadastrado,
                você receberá as instruções para redefinir sua senha.
              </p>
              <a href="/login" className="block mt-4 text-sm text-green-400 hover:text-green-300">
                Voltar para o login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-400">
                Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
              </p>
              {erro && <p className="text-red-400 text-sm">{erro}</p>}
              <div>
                <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <a href="/login" className="block text-center text-xs text-gray-500 hover:text-gray-400">
                Voltar para o login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
