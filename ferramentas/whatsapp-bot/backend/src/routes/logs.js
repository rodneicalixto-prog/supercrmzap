import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function logsRoutes(app) {
  app.addHook('preHandler', authenticate)

  // Listar logs de auditoria (admin vê do próprio tenant, super_admin vê todos)
  app.get('/', async (req) => {
    const { page = 1, limit = 50, action, userId } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {}
    if (req.user.role !== 'super_admin') {
      where.tenantId = req.user.tenantId
    }
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (userId) where.userId = userId

    const [data, total] = await Promise.all([
      prisma.actionsLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true } },
        },
      }),
      prisma.actionsLog.count({ where }),
    ])

    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // Registrar log manualmente (admin+)
  app.post('/', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const { action, details } = req.body
    if (!action) return reply.status(400).send({ error: 'Ação é obrigatória' })

    const log = await prisma.actionsLog.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        action,
        details: details || null,
        ip: req.ip,
      },
    })
    return reply.status(201).send(log)
  })
}

// Helper exportado para registrar logs internamente em outras rotas
export async function registrarLog({ tenantId, userId, action, details, ip }) {
  try {
    await prisma.actionsLog.create({
      data: { tenantId, userId: userId || null, action, details: details || null, ip: ip || null },
    })
  } catch {
    // silencia erros de log para não quebrar fluxo principal
  }
}
