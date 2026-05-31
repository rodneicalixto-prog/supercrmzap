export async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export function requireRole(...roles) {
  return async function (request, reply) {
    await authenticate(request, reply)
    if (!roles.includes(request.user.role)) {
      reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}
