/**
 * Seed inicial — cria o tenant padrão e o usuário super_admin
 * Uso: node src/seed.js
 * Variáveis opcionais: TENANT_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import bcrypt from 'bcryptjs'
import { prisma } from './utils/db.js'

const TENANT_NAME   = process.env.TENANT_NAME    || 'SOS Super MKT'
const ADMIN_NAME    = process.env.ADMIN_NAME     || 'Administrador'
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL    || 'admin@openwave.online'
const ADMIN_PASS    = process.env.ADMIN_PASSWORD || 'Admin2026!'

async function main() {
  console.log('Iniciando seed...')

  // Verifica se o tenant já existe
  let tenant = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: TENANT_NAME, plan: 'pro', status: 'active' }
    })
    console.log(`Tenant criado: ${tenant.name} (${tenant.id})`)
  } else {
    console.log(`Tenant já existe: ${tenant.name} (${tenant.id})`)
  }

  // Verifica se o usuário já existe
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASS, 12)
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      }
    })
    console.log(`Usuário criado: ${user.email} (role: ${user.role})`)
    console.log(`Senha: ${ADMIN_PASS}`)
  } else {
    console.log(`Usuário já existe: ${existing.email}`)
  }

  console.log('Seed concluído.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
