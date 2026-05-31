import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function ModalAula({ aula, onClose, onComplete }) {
  function getEmbedUrl(url) {
    if (!url) return null
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    return null
  }

  const embedUrl = getEmbedUrl(aula.videoUrl)

  function formatDur(sec) {
    if (!sec) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h3 className="font-semibold text-white">{aula.title}</h3>
          {aula.duration && <p className="text-xs text-gray-500">{formatDur(aula.duration)}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full max-w-4xl aspect-video rounded-xl"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : aula.videoUrl ? (
          <video src={aula.videoUrl} controls autoPlay className="w-full max-w-4xl aspect-video rounded-xl" />
        ) : (
          <div className="text-gray-500 text-center">
            <p className="text-4xl mb-3">🎬</p>
            <p>Vídeo não disponível</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 flex items-center justify-between">
        {aula.description && <p className="text-sm text-gray-400 flex-1 mr-4">{aula.description}</p>}
        <button
          onClick={() => { onComplete(aula.id); onClose() }}
          disabled={aula.completed}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium text-white flex-shrink-0"
        >
          {aula.completed ? '✓ Concluída' : 'Marcar como concluída'}
        </button>
      </div>
    </div>
  )
}

function ModalCurso({ curso, onClose, isAdmin, onSave }) {
  const [form, setForm] = useState(
    curso
      ? { title: curso.title, description: curso.description || '', thumbnail: curso.thumbnail || '', category: curso.category || '', published: curso.published }
      : { title: '', description: '', thumbnail: '', category: '', published: false }
  )
  const [loading, setLoading] = useState(false)

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (curso) {
        await api.put(`/academy/courses/${curso.id}`, form)
      } else {
        await api.post('/academy/courses', form)
      }
      onSave()
      onClose()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h3 className="font-semibold text-white mb-4">{curso ? 'Editar curso' : 'Novo curso'}</h3>
        <form onSubmit={save} className="space-y-3">
          {[
            { key: 'title', label: 'Título', required: true },
            { key: 'description', label: 'Descrição' },
            { key: 'thumbnail', label: 'URL da capa (imagem)' },
            { key: 'category', label: 'Categoria' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <input required={f.required} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
            Publicado (visível para alunos)
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAulas({ curso, onClose }) {
  const [aulas, setAulas] = useState([])
  const [modalAula, setModalAula] = useState(null) // null | 'new' | lesson obj
  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', duration: '', published: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAulas() }, [])

  async function loadAulas() {
    const r = await api.get(`/academy/courses/${curso.id}/lessons`)
    setAulas(r.data)
  }

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { ...form, duration: form.duration ? Number(form.duration) : undefined }
      if (modalAula && modalAula !== 'new') {
        await api.put(`/academy/lessons/${modalAula.id}`, data)
      } else {
        await api.post(`/academy/courses/${curso.id}/lessons`, data)
      }
      setModalAula(null)
      loadAulas()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar aula')
    } finally {
      setLoading(false)
    }
  }

  async function remover(id) {
    if (!confirm('Remover esta aula?')) return
    await api.delete(`/academy/lessons/${id}`)
    loadAulas()
  }

  function abrirEditar(aula) {
    setForm({ title: aula.title, description: aula.description || '', videoUrl: aula.videoUrl || '', duration: aula.duration || '', published: aula.published })
    setModalAula(aula)
  }

  function abrirNova() {
    setForm({ title: '', description: '', videoUrl: '', duration: '', published: false })
    setModalAula('new')
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Aulas — {curso.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {aulas.map((a, i) => (
            <div key={a.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-gray-500 text-xs w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{a.title}</p>
                {a.videoUrl && <p className="text-xs text-gray-500 truncate">{a.videoUrl}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.published ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                {a.published ? 'pub' : 'rascunho'}
              </span>
              <button onClick={() => abrirEditar(a)} className="text-xs text-gray-400 hover:text-white">Editar</button>
              <button onClick={() => remover(a.id)} className="text-xs text-gray-500 hover:text-red-400">Remover</button>
            </div>
          ))}
          {aulas.length === 0 && <p className="text-gray-600 text-center py-6">Nenhuma aula cadastrada</p>}
        </div>

        {modalAula && (
          <form onSubmit={salvar} className="border-t border-gray-700 pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{modalAula === 'new' ? 'Nova aula' : 'Editar aula'}</p>
            {[
              { key: 'title', label: 'Título', required: true },
              { key: 'description', label: 'Descrição' },
              { key: 'videoUrl', label: 'URL do vídeo (YouTube, Vimeo ou direto)' },
              { key: 'duration', label: 'Duração (segundos)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <input required={f.required} type={f.type || 'text'} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
              Publicada
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalAula(null)} className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 rounded-lg text-sm font-medium disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}

        {!modalAula && (
          <button onClick={abrirNova} className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-500">
            + Nova aula
          </button>
        )}
      </div>
    </div>
  )
}

export default function Academy() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalCurso, setModalCurso] = useState(null) // null | 'new' | curso obj
  const [modalAulas, setModalAulas] = useState(null)
  const [cursoAberto, setCursoAberto] = useState(null)
  const [aulaAberta, setAulaAberta] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/academy/courses')
      setCursos(r.data)
    } finally {
      setLoading(false)
    }
  }

  async function removerCurso(id) {
    if (!confirm('Remover este curso e todas as aulas?')) return
    await api.delete(`/academy/courses/${id}`)
    load()
  }

  async function marcarConcluida(lessonId) {
    await api.post(`/academy/lessons/${lessonId}/progress`, { completed: true })
    if (cursoAberto) {
      const r = await api.get(`/academy/courses/${cursoAberto.id}`)
      setCursoAberto(r.data)
    }
    load()
  }

  async function abrirCurso(curso) {
    const r = await api.get(`/academy/courses/${curso.id}`)
    setCursoAberto(r.data)
  }

  if (cursoAberto) {
    return (
      <div className="h-full flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <button onClick={() => setCursoAberto(null)} className="text-gray-400 hover:text-white text-sm">← Voltar</button>
          <div>
            <h2 className="text-base font-bold text-white">{cursoAberto.title}</h2>
            {cursoAberto.category && <p className="text-xs text-gray-500">{cursoAberto.category}</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cursoAberto.lessons?.map((aula, i) => (
            <button
              key={aula.id}
              onClick={() => setAulaAberta(aula)}
              className="w-full flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${aula.completed ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                {aula.completed ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{aula.title}</p>
                {aula.description && <p className="text-xs text-gray-500 truncate">{aula.description}</p>}
              </div>
              {aula.duration && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {Math.floor(aula.duration / 60)}:{String(aula.duration % 60).padStart(2, '0')}
                </span>
              )}
              <span className="text-gray-600 text-lg flex-shrink-0">▶</span>
            </button>
          ))}
          {cursoAberto.lessons?.length === 0 && (
            <p className="text-center text-gray-600 py-12">Nenhuma aula disponível</p>
          )}
        </div>
        {aulaAberta && (
          <ModalAula
            aula={aulaAberta}
            onClose={() => setAulaAberta(null)}
            onComplete={marcarConcluida}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Academy</h2>
          <p className="text-xs text-gray-500 mt-0.5">{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModalCurso('new')}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg"
          >
            + Novo curso
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-center text-gray-500 py-12 text-sm">Carregando...</div>}
        {!loading && cursos.length === 0 && (
          <div className="text-center text-gray-600 py-16">
            <p className="text-4xl mb-3">🎓</p>
            <p>Nenhum curso disponível</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursos.map(curso => (
            <div key={curso.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
              {curso.thumbnail ? (
                <img src={curso.thumbnail} alt={curso.title} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-green-900 to-gray-800 flex items-center justify-center text-4xl">🎓</div>
              )}
              <div className="p-4">
                {curso.category && <p className="text-xs text-green-400 mb-1">{curso.category}</p>}
                <h3 className="font-semibold text-white">{curso.title}</h3>
                {curso.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{curso.description}</p>}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{curso.totalLessons} aula{curso.totalLessons !== 1 ? 's' : ''}</span>
                  <span>{curso.completedLessons}/{curso.totalLessons} concluídas</span>
                </div>
                <ProgressBar value={curso.completedLessons} max={curso.totalLessons} />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => abrirCurso(curso)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium text-white"
                  >
                    {curso.completedLessons > 0 ? 'Continuar' : 'Começar'}
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => setModalAulas(curso)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white" title="Gerenciar aulas">📝</button>
                      <button onClick={() => { setModalCurso(curso) }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white" title="Editar curso">✏️</button>
                      <button onClick={() => removerCurso(curso.id)} className="px-3 py-2 bg-gray-700 hover:text-red-400 rounded-lg text-xs text-gray-400" title="Remover curso">🗑️</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalCurso && (
        <ModalCurso
          curso={modalCurso === 'new' ? null : modalCurso}
          isAdmin={isAdmin}
          onClose={() => setModalCurso(null)}
          onSave={load}
        />
      )}
      {modalAulas && (
        <ModalAulas
          curso={modalAulas}
          onClose={() => { setModalAulas(null); load() }}
        />
      )}
    </div>
  )
}
