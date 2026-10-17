-- Migração incremental — executar no banco existente (tabelas novas apenas)
-- Comando: docker exec -i sos_postgres psql -U postgres -d supercrmzap < migrate.sql

CREATE TABLE IF NOT EXISTS "AcademyCourse" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "thumbnail"   TEXT,
  "category"    TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "published"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyCourse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademyCourse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AcademyLesson" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "courseId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "videoUrl"    TEXT,
  "duration"    INTEGER,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "published"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyLesson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademyLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AcademyProgress" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "lessonId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademyProgress_lessonId_userId_key" UNIQUE ("lessonId", "userId"),
  CONSTRAINT "AcademyProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
