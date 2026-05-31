FROM node:20-bullseye-slim

# Dependências do sistema para o Prisma no Debian Bullseye (OpenSSL 1.1.x)
RUN apt-get update -y && apt-get install -y openssl libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
