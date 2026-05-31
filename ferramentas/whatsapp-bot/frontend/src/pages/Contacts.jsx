import { useEffect, useState } from 'react'
import { api } from '../services/api'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | contact object
  const [form, setForm] = useState({ name: '', phone: '', email: '', tags: '', notes: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    const r = await api.get('/contacts', { params: { search } })
    setContacts(r.data)
  }

  function openNew() {
    setForm({ name: '', phone: '', email: '', tags: '', notes: '' })
    setModal('new')
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone, email: c.email || '', tags: (c.tags || []).join(', '), notes: c.notes || '' })
    setModal(c)
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
    try {
      if (modal === 'new') {
        await api.post('/contacts', payload)
      } else {
        await api.put(`/contacts/${modal.id}`, payload)
      }
      setModal(null)
      load()
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    if (!confirm('Remover contato?')) return
    await api.delete(`/contacts/${id}`)
    load()
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar contato..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        />
        <button onClick={openNew} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg whitespace-nowrap">
          + Novo contato
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {contacts.map(c => (
              <tr key={c.id} className="hover:bg-gray-900 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-400">{c.phone}</td>
                <td className="px-4 py-3 text-gray-400">{c.email || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.autoSaved && <span className="text-xs text-blue-400">auto</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="text-xs text-gray-500 hover:text-white mr-3">Editar</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-gray-500 hover:text-red-400">Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contacts.length === 0 && (
          <div className="text-center text-gray-600 py-16">Nenhum contato encontrado</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-4">{modal === 'new' ? 'Novo contato' : 'Editar contato'}</h3>
            <form onSubmit={save} className="space-y-3">
              {[
                { key: 'name', label: 'Nome', required: true },
                { key: 'phone', label: 'Telefone', required: true },
                { key: 'email', label: 'E-mail' },
                { key: 'tags', label: 'Tags (separadas por vírgula)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input
                    required={f.required}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                />
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
