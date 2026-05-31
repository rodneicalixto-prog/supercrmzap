-- Criar banco n8n se não existir
SELECT 'CREATE DATABASE n8n' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Inicialização do banco supercrmzap
-- Executado automaticamente pelo Postgres na primeira vez

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"      TEXT NOT NULL,
  "plan"      TEXT NOT NULL DEFAULT 'free',
  "status"    TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'user',
  "status"       TEXT NOT NULL DEFAULT 'active',
  "lastLogin"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key" UNIQUE ("email"),
  CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WaInstance" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "nomeInterno" TEXT,
  "phone"       TEXT,
  "status"      TEXT NOT NULL DEFAULT 'desconectado',
  "sessionData" JSONB,
  "webhookUrl"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaInstance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WaInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WaInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Contact" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "email"     TEXT,
  "tags"      TEXT[] NOT NULL DEFAULT '{}',
  "notes"     TEXT,
  "autoSaved" BOOLEAN NOT NULL DEFAULT false,
  "source"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "contactId"  TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'open',
  "assignedTo" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Conversation_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WaInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "conversationId" TEXT NOT NULL,
  "direction"      TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'text',
  "content"        TEXT,
  "mediaUrl"       TEXT,
  "isSilent"       BOOLEAN NOT NULL DEFAULT false,
  "externalId"     TEXT,
  "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt"         TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "KanbanBoard" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"     TEXT NOT NULL,
  "workflowName" TEXT NOT NULL,
  "columns"      JSONB NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KanbanBoard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KanbanBoard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "KanbanCard" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "boardId"        TEXT NOT NULL,
  "conversationId" TEXT,
  "columnId"       TEXT NOT NULL,
  "position"       INTEGER NOT NULL,
  "metadata"       JSONB,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KanbanCard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KanbanCard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "KanbanBoard"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KanbanCard_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Schedule" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "instanceId"  TEXT,
  "phone"       TEXT NOT NULL,
  "message"     TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "sentAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Schedule_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WaInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"            TEXT NOT NULL,
  "plan"                TEXT NOT NULL,
  "amount"              DOUBLE PRECISION NOT NULL,
  "interval"            TEXT NOT NULL DEFAULT 'monthly',
  "asaasCustomerId"     TEXT,
  "asaasSubscriptionId" TEXT,
  "status"              TEXT NOT NULL DEFAULT 'active',
  "expiresAt"           TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Webhook" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"   TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "url"        TEXT NOT NULL,
  "events"     TEXT[] NOT NULL DEFAULT '{}',
  "secret"     TEXT,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Webhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ActionsLog" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT,
  "action"    TEXT NOT NULL,
  "details"   JSONB,
  "ip"        TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionsLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActionsLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ActionsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabela de controle do Prisma (necessária para o cliente funcionar)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                    TEXT NOT NULL,
  "checksum"              TEXT NOT NULL,
  "finished_at"           TIMESTAMPTZ,
  "migration_name"        TEXT NOT NULL,
  "logs"                  TEXT,
  "rolled_back_at"        TIMESTAMPTZ,
  "started_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "applied_steps_count"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
