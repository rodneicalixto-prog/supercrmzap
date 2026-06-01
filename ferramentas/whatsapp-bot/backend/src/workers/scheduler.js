import { prisma } from '../utils/db.js'
import { enviarTexto, enviarMidia } from '../utils/evolution.js'

const INTERVALO_MS = 30_000

async function processarAgendamentos() {
  const agora = new Date()

  // Marca atomicamente como 'processing' antes de processar — evita duplo envio em restart
  const resultado = await prisma.schedule.updateMany({
    where: { status: 'pending', scheduledAt: { lte: agora } },
    data: { status: 'processing' },
  })

  if (resultado.count === 0) return

  const pendentes = await prisma.schedule.findMany({
    where: { status: 'processing', scheduledAt: { lte: agora } },
    include: { instance: true },
    take: 50,
  })

  console.log(`[Scheduler] ${pendentes.length} mensagem(ns) para enviar`)

  for (const agendamento of pendentes) {
    try {
      if (!agendamento.instance) throw new Error('Instância não encontrada')

      const nomeInstancia = agendamento.instance.nomeInterno || agendamento.instance.name
      if (agendamento.mediaUrl) {
        await enviarMidia(nomeInstancia, agendamento.phone, {
          tipo: agendamento.mediaType || 'document',
          url: agendamento.mediaUrl,
          legenda: agendamento.message || '',
        })
      } else {
        await enviarTexto(nomeInstancia, agendamento.phone, agendamento.message)
      }

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
  // Recupera mensagens travadas em 'processing' de runs anteriores
  await prisma.schedule.updateMany({
    where: { status: 'processing' },
    data: { status: 'pending' },
  })

  console.log('[Scheduler] Worker iniciado. Intervalo: 30s')
  await processarAgendamentos()
  setInterval(processarAgendamentos, INTERVALO_MS)
}

iniciar().catch(err => {
  console.error('[Scheduler] Erro fatal:', err)
  process.exit(1)
})
