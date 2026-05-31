import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ROLES = ['user', 'admin', 'super_admin']

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null) // null | 'new' | user object
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const r = await api.get('/users')
    setUsers(r.data)
  }

  function openNew() {
    setForm({ name: '', email: '', password: '', role: 'user' })
    setModal('new')
  }

  function openEdit(u) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setModal(u)
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form }
    if (!payload.password) delete payload.password
    try {
      if (modal === 'new') {
        await api.post('/users', payload)
      } else {
        await api.put(`/users/${modal.id}`, payload)
      }
      setModal(null)
      load()
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    if (id === me?.id) return alert('Não é possível remover sua própria conta.')
    if (!confirm('Remover usuário?')) return
    await api.delete(`/users/${id}`)
    load()
  }

  const roleColor = {
    super_admin: 'text-purple-400',
    admin: 'text-blue-400',
    user: 'text-gray-400',
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Usuários</h2>
        <button onClick={openNew} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg">
          + Novo usuário
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-900 transition-colors">
                <td className="px-4 py-3 text-white font-medium">
                  {u.name}
                  {u.id === me?.id && <span className="ml-2 text-xs text-gray-600">(você)</span>}
                </td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className={`px-4 py-3 font-medium capitalize ${roleColor[u.role] || 'text-gray-400'}`}>{u.role.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)} className="text-xs text-gray-500 hover:text-white mr-3">Editar</button>
                  <button onClick={() => remove(u.id)} className="text-xs text-gray-500 hover:text-red-400">Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center text-gray-600 py-16">Nenhum usuário encontrado</div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-4">{modal === 'new' ? 'Novo usuário' : 'Editar usuário'}</h3>
            <form onSubmit={save} className="space-y-3">
              {[
                { key: 'name', label: 'Nome', required: true },
                { key: 'email', label: 'E-mail', required: modal === 'new', type: 'email' },
                { key: 'password', label: modal === 'new' ? 'Senha' : 'Nova senha (deixe em branco para não alterar)', required: modal === 'new', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input
                    required={f.required}
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Perfil</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
