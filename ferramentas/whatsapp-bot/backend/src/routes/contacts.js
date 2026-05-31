import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function contactRoutes(app) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req) => {
    const { search, tag, page = 1, limit = 50 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = { tenantId: req.user.tenantId }
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } }
    ]
    if (tag) where.tags = { has: tag }
    const [data, total] = await Promise.all([
      prisma.contact.findMany({ where, orderBy: { name: 'asc' }, skip, take: Number(limit) }),
      prisma.contact.count({ where }),
    ])
    return { data, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  })

  app.post('/', async (req) => {
    const { name, phone, email, tags, notes } = req.body
    return prisma.contact.create({
      data: { tenantId: req.user.tenantId, name, phone, email, tags: tags || [], notes }
    })
  })

  app.put('/:id', async (req, reply) => {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!contact) return reply.status(404).send({ error: 'Não encontrado' })
    return prisma.contact.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', async (req, reply) => {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!contact) return reply.status(404).send({ error: 'Não encontrado' })
    await prisma.contact.delete({ where: { id: req.params.id } })
    return { deleted: true }
  })

  // Exportar CSV
  app.get('/export', async (req, reply) => {
    const contacts = await prisma.contact.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { name: 'asc' },
    })
    const header = 'nome,telefone,email,tags,notas\n'
    const rows = contacts.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.tags || []).join(';').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ].join(',')).join('\n')
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="contatos.csv"')
    return reply.send(header + rows)
  })

  // Importar CSV
  app.post('/import', async (req, reply) => {
    const { csv } = req.body
    if (!csv) return reply.status(400).send({ error: 'CSV obrigatório' })
    const lines = csv.trim().split('\n')
    const dataLines = lines[0].toLowerCase().includes('nome') ? lines.slice(1) : lines
    let created = 0, skipped = 0
    for (const line of dataLines) {
      if (!line.trim()) continue
      const cols = parseCsvLine(line)
      const [name, phone, email, tagsRaw, notes] = cols
      if (!name || !phone) { skipped++; continue }
      const tags = tagsRaw ? tagsRaw.split(';').map(t => t.trim()).filter(Boolean) : []
      try {
        await prisma.contact.create({
          data: {
            tenantId: req.user.tenantId,
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            tags,
            notes: notes?.trim() || null,
          }
        })
        created++
      } catch {
        skipped++
      }
    }
    return { created, skipped }
  })
}

function parseCsvLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}
