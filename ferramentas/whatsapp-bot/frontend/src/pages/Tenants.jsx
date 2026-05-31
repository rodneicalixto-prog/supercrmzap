import { useEffect, useState } from 'react'
import { api } from '../services/api'

const PLANO_COLOR = {
  free: 'text-gray-400',
  pro: 'text-blue-400',
  enterprise: 'text-purple-400',
}

const STATUS_COLOR = {
  active: 'text-green-400',
  suspended: 'text-red-400',
  inactive: 'text-gray-500',
}

const STATUS_LABEL = { active: 'Ativo', suspended: 'Suspenso', inactive: 'Inativo' }

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', plan: 'free', adminName: '', adminEmail: '', adminPassword: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const r = await api.get('/tenants')
    setTenants(r.data)
  }

  function openNew() {
    setForm({ name: '', plan: 'free', adminName: '', adminEmail: '', adminPassword: '' })
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/tenants', form)
      setModal(false)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar tenant')
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(t) {
    const novoStatus = t.status === 'active' ? 'suspended' : 'active'
    await api.patch(`/tenants/${t.id}/status`, { status: novoStatus })
    load()
  }

  async function remove(t) {
    if (!confirm(`Remover "${t.name}" e TODOS os dados? Esta ação não pode ser desfeita.`)) return
    await api.delete(`/tenants/${t.id}`)
    load()
  }

  async function mudarPlano(t, plan) {
    await api.put(`/tenants/${t.id}`, { plan })
    load()
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Tenants</h2>
          <p className="text-xs text-gray-500 mt-0.5">{tenants.length} empresa{tenants.length !== 1 ? 's' : ''} cadastrada{tenants.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg">
          + Novo tenant
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Usuários</th>
              <th className="px-4 py-3">Instâncias</th>
              <th className="px-4 py-3">Contatos</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tenants.map(t => (
              <tr key={t.id} className="hover:bg-gray-900 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <select
                    value={t.plan}
                    onChange={e => mudarPlano(t, e.target.value)}
                    className={`bg-transparent text-xs font-medium focus:outline-none ${PLANO_COLOR[t.plan] || 'text-gray-400'}`}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${STATUS_COLOR[t.status] || 'text-gray-400'}`}>
                  {STATUS_LABEL[t.status] || t.status}
                </td>
                <td className="px-4 py-3 text-gray-400">{t._count?.users ?? 0}</td>
                <td className="px-4 py-3 text-gray-400">{t._count?.instances ?? 0}</td>
                <td className="px-4 py-3 text-gray-400">{t._count?.contacts ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => toggleStatus(t)}
                    className={`text-xs mr-3 ${t.status === 'active' ? 'text-yellow-500 hover:text-yellow-400' : 'text-green-500 hover:text-green-400'}`}
                  >
                    {t.status === 'active' ? 'Suspender' : 'Ativar'}
                  </button>
                  <button onClick={() => remove(t)} className="text-xs text-gray-500 hover:text-red-400">Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && (
          <div className="text-center text-gray-600 py-16">Nenhum tenant cadastrado</div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-4">Novo tenant</h3>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome da empresa</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Plano</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <hr className="border-gray-700" />
              <p className="text-xs text-gray-500">Usuário administrador do tenant</p>
              {[
                { key: 'adminName', label: 'Nome do admin' },
                { key: 'adminEmail', label: 'E-mail', type: 'email', required: true },
                { key: 'adminPassword', label: 'Senha', type: 'password', required: true },
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
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
                  {loading ? 'Criando...' : 'Criar tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
