import { useEffect, useState } from 'react'
import { api } from '../services/api'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const STATUS_COR = {
  pending: 'bg-yellow-800 text-yellow-300 border-yellow-700',
  sent:    'bg-green-800 text-green-300 border-green-700',
  failed:  'bg-red-800 text-red-300 border-red-700',
}

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function Calendar() {
  const today = new Date()
  const [ano, setAno] = useState(today.getFullYear())
  const [mes, setMes] = useState(today.getMonth())
  const [schedules, setSchedules] = useState([])

  useEffect(() => { carregarAgenda() }, [])

  async function carregarAgenda() {
    try {
      const r = await api.get('/schedules', { params: { limit: 500 } })
      setSchedules(r.data.data ?? r.data)
    } catch {
      setSchedules([])
    }
  }

  function navMes(delta) {
    let nm = mes + delta
    let na = ano
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm)
    setAno(na)
  }

  function voltarHoje() {
    setAno(today.getFullYear())
    setMes(today.getMonth())
  }

  // Agrupa agendamentos por dia (chave: "YYYY-MM-DD")
  const porDia = {}
  for (const s of schedules) {
    const dt = new Date(s.scheduledAt || s.sendAt || s.createdAt)
    if (dt.getFullYear() === ano && dt.getMonth() === mes) {
      const key = dt.getDate()
      if (!porDia[key]) porDia[key] = []
      porDia[key].push(s)
    }
  }

  const cells = buildGrid(ano, mes)
  const isHoje = (d) => d && ano === today.getFullYear() && mes === today.getMonth() && d === today.getDate()

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <button
          onClick={() => navMes(-1)}
          className="px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-400 hover:text-white"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-white min-w-[200px] text-center">
          {MESES[mes]} {ano}
        </h2>
        <button
          onClick={() => navMes(1)}
          className="px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-400 hover:text-white"
        >
          →
        </button>
        <button
          onClick={voltarHoje}
          className="ml-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300"
        >
          Hoje
        </button>
        <button
          onClick={carregarAgenda}
          className="ml-auto px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-xs text-gray-400 hover:text-white"
        >
          Atualizar
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs text-gray-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => (
            <div
              key={idx}
              className={`min-h-[90px] rounded-lg p-1.5 border ${
                !day
                  ? 'border-transparent'
                  : isHoje(day)
                  ? 'border-green-600 bg-green-950'
                  : 'border-gray-800 bg-gray-900'
              }`}
            >
              {day && (
                <>
                  <div className={`text-xs font-semibold mb-1 ${isHoje(day) ? 'text-green-400' : 'text-gray-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {(porDia[day] || []).slice(0, 4).map((s, i) => {
                      const status = s.status || 'pending'
                      const cor = STATUS_COR[status] || STATUS_COR.pending
                      const phone = s.contact?.phone || s.contactPhone || ''
                      const msg = s.message || s.content || s.body || ''
                      return (
                        <div
                          key={s.id || i}
                          className={`text-xs px-1.5 py-0.5 rounded border truncate ${cor}`}
                          title={`${phone} — ${msg}`}
                        >
                          {phone && <span className="font-medium">{phone.slice(-8)} </span>}
                          <span className="opacity-80">{msg.slice(0, 20)}{msg.length > 20 ? '…' : ''}</span>
                        </div>
                      )
                    })}
                    {(porDia[day] || []).length > 4 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{(porDia[day] || []).length - 4} mais
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex gap-4 mt-4 justify-end text-xs">
          {Object.entries({ pending: 'Pendente', sent: 'Enviado', failed: 'Falhou' }).map(([k, label]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded border inline-block ${STATUS_COR[k]}`} />
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
