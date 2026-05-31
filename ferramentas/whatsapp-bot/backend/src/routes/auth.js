import bcrypt from 'bcryptjs'
import { prisma } from '../utils/db.js'
import { sendMail } from '../utils/mail.js'

export default async function authRoutes(app) {

  app.post('/login', async (req, reply) => {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }
    if (user.status !== 'active') {
      return reply.status(403).send({ error: 'Conta suspensa' })
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    const token = app.jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role, name: user.name },
      { expiresIn: '8h' }
    )
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  })

  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { message: 'Se o e-mail existir, você receberá as instruções.' }
    const token = app.jwt.sign({ id: user.id, purpose: 'reset' }, { expiresIn: '1h' })
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    await sendMail({
      to: email,
      subject: 'Redefinição de senha — SOS Super MKT',
      html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p><p>Válido por 1 hora.</p>`
    })
    return { message: 'Se o e-mail existir, você receberá as instruções.' }
  })

  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body
    let payload
    try {
      payload = app.jwt.verify(token)
    } catch {
      return reply.status(400).send({ error: 'Token inválido ou expirado' })
    }
    if (payload.purpose !== 'reset') {
      return reply.status(400).send({ error: 'Token inválido' })
    }
    const hash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: payload.id }, data: { passwordHash: hash } })
    return { message: 'Senha redefinida com sucesso' }
  })
}
