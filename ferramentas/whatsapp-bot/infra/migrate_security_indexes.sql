-- Unique constraint em Contact(tenantId, phone) para upsert atômico no webhook
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_phone_key" UNIQUE ("tenantId", "phone");

-- Unique constraint em WaInstance.nomeInterno
ALTER TABLE "WaInstance" ADD CONSTRAINT "WaInstance_nomeInterno_key" UNIQUE ("nomeInterno");

-- Índices de performance
CREATE INDEX IF NOT EXISTS "Contact_tenantId_phone_idx"        ON "Contact"      ("tenantId", "phone");
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_status_idx"  ON "Conversation" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_contactId_idx" ON "Conversation" ("tenantId", "contactId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_sentAt_idx" ON "Message"      ("conversationId", "sentAt");
CREATE INDEX IF NOT EXISTS "Message_externalId_idx"            ON "Message"      ("externalId");
CREATE INDEX IF NOT EXISTS "Schedule_status_scheduledAt_idx"   ON "Schedule"     ("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "WaInstance_nomeInterno_idx"        ON "WaInstance"   ("nomeInterno");
