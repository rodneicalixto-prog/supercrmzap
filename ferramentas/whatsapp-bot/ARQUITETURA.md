# 🏗️ Documento de Arquitetura — WhatsApp Bot SaaS

**Projeto:** SOS Super MKT — WhatsApp Bot  
**Versão:** 1.0  
**Data:** 2026  

---

## 1. Visão geral do sistema

Sistema SaaS multi-tenant para automação de atendimento via WhatsApp. Cada tenant (empresa) possui sua própria hierarquia de usuários, instâncias WhatsApp, workflows de automação e base de dados isolada por `tenant_id`.

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                    │
│              React + Vite + TailwindCSS SPA              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / WSS
┌───────────────────────▼─────────────────────────────────┐
│                   NGINX (Reverse Proxy)                  │
│          /api → backend :3000  |  / → frontend :5173    │
└───────────┬───────────────────────────┬─────────────────┘
            │                           │
┌───────────▼──────────┐   ┌────────────▼────────────────┐
│  Backend Node.js      │   │    Evolution Go (WA API)    │
│  Fastify + Prisma     │   │    Port :8080 · Go lang     │
│  Port :3000           │◄──│    whatsmeow protocol       │
│                       │   └─────────────────────────────┘
│  ┌─────────────────┐  │   ┌─────────────────────────────┐
│  │  JWT Auth       │  │   │    n8n (Automações)         │
│  │  WebSocket      │  │   │    Port :5678               │
│  │  Webhook recv.  │  │◄──│    Workflows visuais        │
│  │  REST API       │  │   └─────────────────────────────┘
│  └─────────────────┘  │
└───────────┬───────────┘
            │
┌───────────▼───────────────────────────────────────────┐
│                   DADOS E CACHE                        │
│  PostgreSQL :5432  │  Redis :6379  │  MinIO :9000     │
│  (dados da app)    │  (cache/filas) │  (mídias WA)    │
└───────────────────────────────────────────────────────┘
```

---

## 2. Banco de dados — Schema principal

### Tabelas e relacionamentos

```
tenants
  id, name, plan, status, created_at

users
  id, tenant_id, name, email, password_hash, role (super_admin|admin|user)
  status, last_login, created_at

wa_instances
  id, tenant_id, user_id, name, phone, status (connected|disconnected|qr)
  session_data, webhook_url, created_at

contacts
  id, tenant_id, user_id, name, phone, email, tags[]
  notes, auto_saved, source, created_at

conversations
  id, tenant_id, user_id, instance_id, contact_id
  status (open|pending|resolved), assigned_to, created_at

messages
  id, conversation_id, direction (in|out), type (text|image|audio|video|doc)
  content, media_url, is_silent (admin intervention), sent_at, read_at

kanban_boards
  id, tenant_id, workflow_name, columns (jsonb), created_at

kanban_cards
  id, board_id, conversation_id, column_id, position, metadata, updated_at

schedules
  id, tenant_id, user_id, contact_id, title, datetime
  notification_sent, created_at

quick_replies
  id, tenant_id, user_id, shortcut, content, created_at

webhooks
  id, tenant_id, name, url, events[], secret, status, retry_count

subscriptions
  id, tenant_id, plan, amount, interval (monthly|annual)
  asaas_customer_id, asaas_subscription_id, status, expires_at

actions_log
  id, tenant_id, user_id, action, details, ip, created_at
```

---

## 3. Endpoints da API REST

### Autenticação
```
POST   /auth/login              → JWT + refresh token
POST   /auth/refresh            → Renovar token
POST   /auth/forgot-password    → Enviar e-mail SMTP
POST   /auth/reset-password     → Redefinir senha
```

### Instâncias WhatsApp
```
GET    /instances               → Listar instâncias do tenant
POST   /instances               → Criar + configurar webhook Evolution
GET    /instances/:id/qr        → QR Code para escanear
GET    /instances/:id/status    → Status de conexão
DELETE /instances/:id           → Desconectar e remover
```

### Atendimentos
```
GET    /conversations           → Listar (filtros: status, fila, agente)
GET    /conversations/:id       → Detalhes + histórico
POST   /conversations/:id/assign → Atribuir a agente
POST   /conversations/:id/resolve → Resolver ticket
POST   /conversations/:id/reopen  → Reabrir ticket
POST   /conversations/:id/silent  → Intervenção silenciosa do admin
```

### Mensagens
```
POST   /messages/text           → Enviar texto (Evolution Go)
POST   /messages/media          → Enviar mídia
POST   /messages/audio          → Enviar áudio (PTT)
```

### Contatos
```
GET    /contacts                → Listar com filtros
POST   /contacts                → Criar contato
PUT    /contacts/:id            → Editar
DELETE /contacts/:id            → Remover
POST   /contacts/import         → Import CSV/XLS/vCard
GET    /contacts/export         → Export CSV
```

### Webhook receivers
```
POST   /webhook/evolution/:userId  → Recebe eventos da Evolution Go
POST   /webhook/asaas              → Recebe eventos de pagamento
```

---

## 4. WebSocket — Salas por tenant/usuário

```javascript
// Conexão
ws://api.seuapp.com/ws?token=JWT

// Eventos emitidos pelo servidor → cliente
{ event: 'new_message',     data: { conversation_id, message } }
{ event: 'conv_assigned',   data: { conversation_id, agent } }
{ event: 'conv_resolved',   data: { conversation_id } }
{ event: 'silent_message',  data: { conversation_id, message, admin } }
{ event: 'kanban_moved',    data: { card_id, from_col, to_col } }
{ event: 'instance_status', data: { instance_id, status, qr_code } }
{ event: 'typing',          data: { conversation_id, contact } }
```

---

## 5. Fluxo de intervenção silenciosa

```
Admin clica "Entrar silenciosamente" na conversa
         │
         ▼
Backend cria mensagem com is_silent=true + author=admin
         │
         ▼
WebSocket emite para o User (agente): evento silent_message
         │
User vê a mensagem no painel com badge "Admin · silencioso"
         │
O contato externo no WhatsApp NUNCA vê essa mensagem
(não é enviada para a Evolution Go)
```

---

## 6. Variáveis de ambiente (.env)

```env
# App
NODE_ENV=production
PORT=3000
JWT_SECRET=sua_chave_jwt_super_secreta
JWT_REFRESH_SECRET=sua_chave_refresh

# PostgreSQL
DATABASE_URL=postgresql://postgres:senha@localhost:5432/sos_bot

# Redis
REDIS_URL=redis://localhost:6379

# Evolution Go
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_global

# n8n
N8N_WEBHOOK_URL=https://n8n.seuapp.com/webhook

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Asaas (Pagamentos)
ASAAS_API_KEY=$aas_sua_chave
ASAAS_SANDBOX=true

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sistema@seudominio.com.br
SMTP_PASS=sua_senha_app
SMTP_FROM=SOS Super MKT <no-reply@seudominio.com.br>

# Frontend
VITE_API_URL=https://api.seuapp.com
VITE_WS_URL=wss://api.seuapp.com
```

---

## 7. docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: sos_bot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: senha_segura
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  evolution:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      SERVER_PORT: 8080
      GLOBAL_API_KEY: sua_chave_global
      POSTGRES_AUTH_DB: postgresql://postgres:senha_segura@postgres:5432/evogo_auth
      POSTGRES_USERS_DB: postgresql://postgres:senha_segura@postgres:5432/evogo_users
      WEBHOOK_URL: http://backend:3000/webhook/evolution
      DATABASE_SAVE_MESSAGES: "true"
    depends_on:
      - postgres

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: senha_n8n
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: postgres
      DB_POSTGRESDB_PASSWORD: senha_segura
    depends_on:
      - postgres

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:senha_segura@postgres:5432/sos_bot
      REDIS_URL: redis://redis:6379
      EVOLUTION_API_URL: http://evolution:8080
    depends_on:
      - postgres
      - redis
      - evolution
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
  minio_data:
```

---

## 8. Roadmap de desenvolvimento

### Fase 1 — Infraestrutura base
- [ ] docker-compose com todos os serviços
- [ ] Backend Fastify + Prisma schema + migrações
- [ ] Auth JWT com refresh token + hierarquia de roles
- [ ] SMTP para recuperação de senha

### Fase 2 — Integração WhatsApp
- [ ] Endpoint de instâncias (criar, QR, status, deletar)
- [ ] Webhook receiver da Evolution Go
- [ ] Repasse para n8n
- [ ] WebSocket em tempo real

### Fase 3 — Módulos de atendimento
- [ ] Conversas + mensagens + tags
- [ ] Intervenção silenciosa do Admin
- [ ] Filas de atendimento
- [ ] Respostas rápidas

### Fase 4 — CRM e produtividade
- [ ] Contatos com auto-save + import/export
- [ ] Kanban por workflow (drag-and-drop)
- [ ] Agenda individual
- [ ] Dashboard inteligente

### Fase 5 — Monetização
- [ ] Integração Asaas (planos recorrentes + PIX)
- [ ] Webhook de pagamento → controle de acesso
- [ ] Suspensão automática por inadimplência

### Fase 6 — Academy e polish
- [ ] Upload de vídeo-aulas (arquivo + link externo)
- [ ] Player estilo Netflix
- [ ] Módulos bloqueados por progresso
