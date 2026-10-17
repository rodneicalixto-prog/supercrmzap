-- Adiciona suporte a mídia nos agendamentos
ALTER TABLE "Schedule" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "Schedule" ADD COLUMN IF NOT EXISTS "mediaType" TEXT;
