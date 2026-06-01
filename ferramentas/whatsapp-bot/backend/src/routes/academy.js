import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../utils/db.js'

export default async function academyRoutes(app) {
  app.addHook('preHandler', authenticate)

  // ── CURSOS ────────────────────────────────────────────────────────────────

  app.get('/courses', async (req) => {
    const where = { tenantId: req.user.tenantId }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    if (!isAdmin) where.published = true

    const courses = await prisma.academyCourse.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { lessons: true } },
        lessons: {
          where: isAdmin ? {} : { published: true },
          select: { id: true },
        },
      },
    })

    // Para cada curso, calcular progresso do usuário
    const progressData = await prisma.academyProgress.findMany({
      where: { userId: req.user.id },
      select: { lessonId: true, completed: true },
    })
    const completedSet = new Set(progressData.filter(p => p.completed).map(p => p.lessonId))

    return courses.map(c => ({
      ...c,
      totalLessons: c.lessons.length,
      completedLessons: c.lessons.filter(l => completedSet.has(l.id)).length,
      lessons: undefined,
    }))
  })

  app.get('/courses/:id', async (req, reply) => {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    const course = await prisma.academyCourse.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        lessons: {
          where: isAdmin ? {} : { published: true },
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!course) return reply.status(404).send({ error: 'Curso não encontrado' })
    if (!isAdmin && !course.published) return reply.status(403).send({ error: 'Curso não disponível' })

    const progressData = await prisma.academyProgress.findMany({
      where: { userId: req.user.id, lessonId: { in: course.lessons.map(l => l.id) } },
      select: { lessonId: true, completed: true },
    })
    const progressMap = Object.fromEntries(progressData.map(p => [p.lessonId, p.completed]))

    return {
      ...course,
      lessons: course.lessons.map(l => ({ ...l, completed: progressMap[l.id] || false })),
    }
  })

  app.post('/courses', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const { title, description, thumbnail, category, order } = req.body
    if (!title) return reply.status(400).send({ error: 'Título é obrigatório' })
    const course = await prisma.academyCourse.create({
      data: { tenantId: req.user.tenantId, title, description, thumbnail, category, order: order || 0 },
    })
    return reply.status(201).send(course)
  })

  app.put('/courses/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const course = await prisma.academyCourse.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!course) return reply.status(404).send({ error: 'Curso não encontrado' })
    const { title, description, thumbnail, category, order, published } = req.body
    return prisma.academyCourse.update({
      where: { id: req.params.id },
      data: { ...(title && { title }), description, thumbnail, category, ...(order !== undefined && { order }), ...(published !== undefined && { published }) },
    })
  })

  app.delete('/courses/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const course = await prisma.academyCourse.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!course) return reply.status(404).send({ error: 'Curso não encontrado' })
    // Cascade via Prisma onDelete: Cascade nas lessons
    await prisma.academyCourse.delete({ where: { id: req.params.id } })
    return { removido: true }
  })

  // ── AULAS ─────────────────────────────────────────────────────────────────

  app.get('/courses/:courseId/lessons', async (req, reply) => {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    const course = await prisma.academyCourse.findFirst({
      where: { id: req.params.courseId, tenantId: req.user.tenantId },
    })
    if (!course) return reply.status(404).send({ error: 'Curso não encontrado' })

    const lessons = await prisma.academyLesson.findMany({
      where: { courseId: req.params.courseId, ...(isAdmin ? {} : { published: true }) },
      orderBy: { order: 'asc' },
    })
    return lessons
  })

  app.post('/courses/:courseId/lessons', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const course = await prisma.academyCourse.findFirst({
      where: { id: req.params.courseId, tenantId: req.user.tenantId },
    })
    if (!course) return reply.status(404).send({ error: 'Curso não encontrado' })

    const { title, description, videoUrl, duration, order, published } = req.body
    if (!title) return reply.status(400).send({ error: 'Título da aula é obrigatório' })

    const lesson = await prisma.academyLesson.create({
      data: { courseId: req.params.courseId, title, description, videoUrl, duration, order: order || 0, published: published || false },
    })
    return reply.status(201).send(lesson)
  })

  app.put('/lessons/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const { title, description, videoUrl, duration, order, published } = req.body
    const lesson = await prisma.academyLesson.findUnique({ where: { id: req.params.id } })
    if (!lesson) return reply.status(404).send({ error: 'Aula não encontrada' })
    return prisma.academyLesson.update({
      where: { id: req.params.id },
      data: { ...(title && { title }), description, videoUrl, ...(duration !== undefined && { duration }), ...(order !== undefined && { order }), ...(published !== undefined && { published }) },
    })
  })

  app.delete('/lessons/:id', { preHandler: requireRole('admin', 'super_admin') }, async (req, reply) => {
    const lesson = await prisma.academyLesson.findUnique({ where: { id: req.params.id } })
    if (!lesson) return reply.status(404).send({ error: 'Aula não encontrada' })
    await prisma.academyLesson.delete({ where: { id: req.params.id } })
    return { removido: true }
  })

  // ── PROGRESSO ─────────────────────────────────────────────────────────────

  app.post('/lessons/:id/progress', async (req, reply) => {
    const { completed } = req.body
    const lesson = await prisma.academyLesson.findUnique({ where: { id: req.params.id } })
    if (!lesson) return reply.status(404).send({ error: 'Aula não encontrada' })

    const progress = await prisma.academyProgress.upsert({
      where: { lessonId_userId: { lessonId: req.params.id, userId: req.user.id } },
      create: { lessonId: req.params.id, userId: req.user.id, completed: completed ?? true },
      update: { completed: completed ?? true, watchedAt: new Date() },
    })
    return progress
  })
}
