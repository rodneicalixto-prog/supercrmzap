FROM node:20-alpine AS base

# OpenSSL necessário para o Prisma no Alpine Linux
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Instalar dependências
COPY package.json ./
RUN npm install --omit=dev

# Gerar cliente Prisma (com binaryTargets para musl)
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código-fonte
COPY src ./src

EXPOSE 3000

# Rodar migrações e iniciar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
