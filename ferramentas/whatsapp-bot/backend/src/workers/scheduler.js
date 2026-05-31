import { prisma } from '../utils/db.js'
import { enviarTexto } from '../utils/evolution.js'

const INTERVALO_MS = 30_000 // verifica a cada 30 segundos

async function processarAgendamentos() {
  const agora = new Date()

  const pendentes = await prisma.schedule.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: agora },
    },
    include: { instance: true },
    take: 50,
  })

  if (pendentes.length === 0) return

  console.log(`[Scheduler] ${pendentes.length} mensagem(ns) para enviar`)

  for (const agendamento of pendentes) {
    try {
      if (!agendamento.instance) {
        throw new Error('Instância não encontrada')
      }

      await enviarTexto(
        agendamento.instance.nomeInterno || agendamento.instance.name,
        agendamento.phone,
        agendamento.message
      )

      await prisma.schedule.update({
        where: { id: agendamento.id },
        data: { status: 'sent', sentAt: new Date() },
      })

      console.log(`[Scheduler] ✓ Enviado para ${agendamento.phone}`)
    } catch (err) {
      console.error(`[Scheduler] ✗ Falha ao enviar para ${agendamento.phone}: ${err.message}`)
      await prisma.schedule.update({
        where: { id: agendamento.id },
        data: { status: 'failed' },
      })
    }
  }
}

async function iniciar() {
  console.log('[Scheduler] Worker de agendamentos iniciado. Intervalo: 30s')
  await processarAgendamentos()
  setInterval(processarAgendamentos, INTERVALO_MS)
}

iniciar().catch(err => {
  console.error('[Scheduler] Erro fatal:', err)
  process.exit(1)
})
