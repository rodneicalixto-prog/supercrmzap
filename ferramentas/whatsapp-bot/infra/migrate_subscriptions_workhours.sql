-- Assinatura de conversa
CREATE TABLE IF NOT EXISTS "ConversationSubscriber" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "userId"         TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("conversationId", "userId")
);

-- Instâncias responsáveis por usuário
CREATE TABLE IF NOT EXISTS "UserInstance" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "instanceId" TEXT NOT NULL REFERENCES "WaInstance"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "instanceId")
);

-- Horário de atendimento no usuário
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workHours" JSONB;

-- Papel supervisor e supervisorId no usuário
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;

-- Departamento no usuário
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- Webhooks n8n e OpenAI por instância
ALTER TABLE "WaInstance" ADD COLUMN IF NOT EXISTS "n8nWebhookUrl" TEXT;
ALTER TABLE "WaInstance" ADD COLUMN IF NOT EXISTS "openaiApiKey"  TEXT;
ALTER TABLE "WaInstance" ADD COLUMN IF NOT EXISTS "openaiWebhook" TEXT;

-- Webhooks n8n e OpenAI por atendente (ramal) — sobrescreve instância quando conversa está atribuída
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "n8nWebhookUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "openaiApiKey"  TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "openaiWebhook" TEXT;
