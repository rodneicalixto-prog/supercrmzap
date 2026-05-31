FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependências
COPY package.json ./
RUN npm install --omit=dev

# Gerar cliente Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código-fonte
COPY src ./src

# Porta padrão
EXPOSE 3000

# Rodar migrações e iniciar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
