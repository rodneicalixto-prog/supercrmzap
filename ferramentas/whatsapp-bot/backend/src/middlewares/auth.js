// Hierarquia de papéis: super_admin > admin > supervisor > user
export const ROLE_LEVEL = {
  super_admin: 4,
  admin: 3,
  supervisor: 2,
  user: 1,
}

export function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0
}

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export function requireRole(...roles) {
  return async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
    if (!roles.includes(request.user?.role)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}

// Valida se o usuário atual pode transferir para o usuário-alvo
// Retorna { ok: true } ou { ok: false, motivo }
export function podeTransferir(remetenteRole, destinatarioRole) {
  const r = roleLevel(remetenteRole)
  const d = roleLevel(destinatarioRole)

  if (remetenteRole === 'super_admin') return { ok: true }

  if (remetenteRole === 'admin') {
    // admin pode transferir para qualquer nível (inclusive super_admin)
    return { ok: true }
  }

  if (remetenteRole === 'supervisor') {
    // supervisor NÃO pode transferir para admin/super_admin
    if (d >= roleLevel('admin')) return { ok: false, motivo: 'Supervisor não pode transferir para admin ou super_admin' }
    return { ok: true }
  }

  if (remetenteRole === 'user') {
    // user NÃO pode transferir para admin/super_admin
    if (d >= roleLevel('admin')) return { ok: false, motivo: 'Usuário não pode transferir para admin ou super_admin' }
    return { ok: true }
  }

  return { ok: false, motivo: 'Permissão insuficiente' }
}
