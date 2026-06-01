import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ROLES_LABELS = {
  user: 'Usuário',
  supervisor: 'Supervisor',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

const DIAS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

const DEFAULT_WORK_HOURS = { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] }

function initForm(u = null) {
  return {
    name: u?.name || '',
    email: u?.email || '',
    password: '',
    role: u?.role || 'user',
    supervisorId: u?.supervisorId || '',
    department: u?.department || '',
    instanceIds: u?.responsibleInstances?.map(r => r.instanceId) || [],
    workHours: u?.workHours
      ? { ...DEFAULT_WORK_HOURS, ...u.workHours }
      : { ...DEFAULT_WORK_HOURS },
  }
}

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [instances, setInstances] = useState([])
  const [modal, setModal] = useState(null) // null | 'new' | user object
  const [form, setForm] = useState(initForm())
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [ru, ri] = await Promise.all([
      api.get('/users'),
      api.get('/instances').catch(() => ({ data: [] })),
    ])
    setUsers(ru.data)
    setInstances(ri.data)
  }

  function openNew() {
    setForm(initForm())
    setModal('new')
  }

  function openEdit(u) {
    setForm(initForm(u))
    setModal(u)
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form }
    if (!payload.password) delete payload.password
    if (!payload.supervisorId) payload.supervisorId = null
    try {
      if (modal === 'new') {
        await api.post('/users', payload)
      } else {
        await api.put(`/users/${modal.id}`, payload)
      }
      setModal(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário')
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

  function toggleDia(d) {
    setForm(f => {
      const days = f.workHours.days.includes(d)
        ? f.workHours.days.filter(x => x !== d)
        : [...f.workHours.days, d].sort((a, b) => a - b)
      return { ...f, workHours: { ...f.workHours, days } }
    })
  }

  function toggleInstance(id) {
    setForm(f => {
      const ids = f.instanceIds.includes(id)
        ? f.instanceIds.filter(x => x !== id)
        : [...f.instanceIds, id]
      return { ...f, instanceIds: ids }
    })
  }

  const roleColor = {
    super_admin: 'text-purple-400',
    admin: 'text-blue-400',
    supervisor: 'text-yellow-400',
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
              <th className="px-4 py-3">Instâncias</th>
              <th className="px-4 py-3">Horário</th>
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
                  {u.department && <p className="text-xs text-gray-500 font-normal">{u.department}</p>}
                </td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className={`px-4 py-3 font-medium ${roleColor[u.role] || 'text-gray-400'}`}>
                  {ROLES_LABELS[u.role] || u.role}
                  {u.supervisorId && (
                    <p className="text-xs text-gray-500 font-normal">
                      ↳ {users.find(x => x.id === u.supervisorId)?.name || '—'}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.instanceIds?.length
                    ? <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{u.instanceIds.length} instância{u.instanceIds.length !== 1 ? 's' : ''}</span>
                    : <span className="text-gray-600">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.workHours
                    ? <span className="text-gray-300">{u.workHours.start}–{u.workHours.end}</span>
                    : <span className="text-gray-600">—</span>
                  }
                </td>
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-white mb-4">{modal === 'new' ? 'Novo usuário' : 'Editar usuário'}</h3>
            <form onSubmit={save} className="space-y-4">
              {/* Campos básicos */}
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

              {/* Perfil */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Perfil</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value, supervisorId: '' }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  {Object.entries(ROLES_LABELS)
                    .filter(([r]) => me?.role === 'super_admin' || r !== 'super_admin')
                    .map(([r, label]) => (
                      <option key={r} value={r}>{label}</option>
                    ))}
                </select>
              </div>

              {/* Supervisor responsável (só para user e supervisor) */}
              {(form.role === 'user' || form.role === 'supervisor') && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {form.role === 'supervisor' ? 'Admin responsável' : 'Supervisor responsável'}
                  </label>
                  <select
                    value={form.supervisorId}
                    onChange={e => setForm(p => ({ ...p, supervisorId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">— Sem supervisor —</option>
                    {users
                      .filter(u => form.role === 'supervisor' ? u.role === 'admin' : u.role === 'supervisor')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({ROLES_LABELS[u.role]})</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Departamento */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Departamento</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  placeholder="Ex: Vendas, Suporte, Financeiro"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Instâncias responsáveis */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Instâncias responsáveis</label>
                {instances.length === 0 ? (
                  <p className="text-xs text-gray-600">Nenhuma instância disponível</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-2">
                    {instances.map(inst => (
                      <label key={inst.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={form.instanceIds.includes(inst.id)}
                          onChange={() => toggleInstance(inst.id)}
                          className="accent-green-500"
                        />
                        <span className="text-sm text-white">{inst.name}</span>
                        <span className={`text-xs ml-auto ${inst.status === 'conectado' ? 'text-green-400' : 'text-gray-500'}`}>
                          {inst.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Horário de atendimento */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Horário de atendimento</label>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-3">
                  {/* Dias */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Dias da semana</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDia(d.value)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            form.workHours.days.includes(d.value)
                              ? 'bg-green-700 border-green-600 text-white'
                              : 'border-gray-600 text-gray-400 hover:border-gray-400'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Horas */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Início</label>
                      <input
                        type="time"
                        value={form.workHours.start}
                        onChange={e => setForm(f => ({ ...f, workHours: { ...f.workHours, start: e.target.value } }))}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <span className="text-gray-500 mt-4">–</span>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Fim</label>
                      <input
                        type="time"
                        value={form.workHours.end}
                        onChange={e => setForm(f => ({ ...f, workHours: { ...f.workHours, end: e.target.value } }))}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
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
