# ⚡ SOS Super MKT

> Central de ferramentas de marketing digital com painel unificado, WhatsApp Bot SaaS e automações integradas.

---

## 📋 Visão geral do projeto

O **SOS Super MKT** é composto por dois pilares principais:

1. **Painel Central** — página HTML com acesso rápido às 7 ferramentas de marketing
2. **WhatsApp Bot SaaS** — plataforma completa em desenvolvimento com Evolution Go, n8n, hierarquia de usuários, Kanban, CRM, agenda e pagamentos recorrentes

---

## 🛠️ Ferramentas do painel

| # | Ferramenta | Tecnologia | Status |
|---|---|---|---|
| 01 | SMS MKT | A mapear | ⏳ em breve |
| 02 | Instabot | InstaBot Pro v5.0 · Delphi + Chrome | ✅ ativo |
| 03 | Facebook MKT | Auto Join Group · Chrome Extension MV2 | ✅ ativo |
| 04 | Telegram MKT | Telegram Sender v1.0.1 · Chrome Extension | ✅ ativo |
| 05 | WhatsApp MKT | MassWhatsAppSender · .NET 4.6 + ChromeDriver | ✅ ativo |
| 06 | Email MKT | UltraMailer v3.5 · Delphi/VCL | ✅ ativo |
| 07 | WhatsApp Bot | Evolution Go + n8n + Node.js + React | ⚙ em dev |

---

## 🏗️ Arquitetura do WhatsApp Bot

### Stack tecnológica

| Camada | Tecnologia | Função |
|---|---|---|
| Backend API | Node.js + Fastify | REST API + WebSockets |
| Frontend | React + Vite + TailwindCSS | SPA multi-tenant |
| Banco de dados | PostgreSQL + Prisma ORM | Dados da aplicação |
| Cache / Filas | Redis | Sessões, pub/sub, filas |
| WhatsApp | Evolution Go (Go + whatsmeow) | Instâncias WA |
| Automação | n8n | Workflows de bot |
| Armazenamento | MinIO | Mídias recebidas |
| Pagamentos | Asaas | Planos recorrentes + PIX |
| Containers | Docker + Docker Compose | Infraestrutura |

### Hierarquia de acesso

```
Super Admin
  └── Controle total do sistema
  └── Gerencia todos os admins e usuários
  └── Configura planos, SMTP, pagamentos, webhooks
  └── Visibilidade global de todas as conversas

Admin
  └── Cria e gerencia usuários do seu tenant
  └── Visualiza todas as conversas dos seus usuários
  └── Intervenção silenciosa nas conversas (só o agente vê)

Usuário
  └── Opera suas instâncias do WhatsApp
  └── Gerencia seus contatos, workflows e agenda
  └── Vê apenas seus próprios dados
```

### Fluxo de mensagens

```
WhatsApp ──► Evolution Go ──► Backend (Node.js)
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                        n8n              PostgreSQL
                     (workflows)         (histórico)
                          │
                          ▼
                   Evolution Go ──► WhatsApp
                   (resposta bot)

Frontend (React) ◄──── WebSocket ◄──── Backend
```

---

## 📁 Estrutura de pastas (WhatsApp Bot)

```
sos-whatsapp-bot/
├── backend/                  # Node.js + Fastify
│   ├── src/
│   │   ├── routes/           # Endpoints da API
│   │   ├── services/         # Lógica de negócio
│   │   ├── middlewares/      # Auth JWT, roles
│   │   ├── webhooks/         # Receivers Evolution + Asaas
│   │   └── websocket/        # Sala por usuário em tempo real
│   ├── prisma/
│   │   └── schema.prisma     # Schema PostgreSQL
│   └── package.json
│
├── frontend/                 # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── pages/            # Atendimentos, Kanban, Contatos...
│   │   ├── components/       # UI reutilizável
│   │   ├── contexts/         # Auth, WebSocket, Theme
│   │   └── services/         # API calls
│   └── package.json
│
├── infra/
│   ├── docker-compose.yml    # Todos os serviços
│   ├── nginx.conf            # Reverse proxy
│   └── .env.example          # Variáveis de ambiente
│
└── README.md
```

---

## 🔌 Integrações

### Evolution Go (WhatsApp)
- **URL base:** `http://localhost:8080`
- **Autenticação:** `GLOBAL_API_KEY`
- **Webhook entrada:** `POST /webhook/evolution/{userId}`
- **Eventos monitorados:** `messages.upsert`, `connection.update`, `contacts.upsert`, `qr.updated`

### n8n (Automações)
- **URL base:** `http://localhost:5678`
- **Trigger:** `POST https://n8n.seuapp.com/webhook/{workflowId}`
- **Fluxo:** Backend recebe → repassa ao n8n → n8n processa → Backend envia resposta

### Asaas (Pagamentos)
- **Ambiente:** sandbox → production
- **Eventos:** `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_RENEWED`
- **Webhook:** `POST /webhook/asaas`

---

## 🚀 Como iniciar o desenvolvimento

### Pré-requisitos
- Node.js 18+
- Docker + Docker Compose
- Git

### 1. Clonar e configurar

```bash
git clone https://github.com/seu-usuario/sos-whatsapp-bot
cd sos-whatsapp-bot
cp infra/.env.example infra/.env
# Editar .env com suas configurações
```

### 2. Subir a infraestrutura

```bash
cd infra
docker-compose up -d
```

### 3. Iniciar o backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 4. Iniciar o frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🗄️ Módulos do WhatsApp Bot

| Módulo | Descrição |
|---|---|
| **Atendimentos** | Conversas em tempo real com lista Atendendo/Aguardando |
| **Respostas Rápidas** | Templates com atalhos `/saudacao` etc |
| **Kanban** | Board por workflow com drag-and-drop via WebSocket |
| **Tarefas** | Gestão de tarefas por agente |
| **Contatos** | CRM com auto-save, import/export CSV, vCard |
| **Agendamentos** | Agenda individual com notificações WA |
| **Tags** | Labels coloridas nas conversas |
| **Chat Interno** | Canal privado entre agentes (intervenção silenciosa) |
| **Dashboard** | KPIs clicáveis com detalhamento por card |
| **Conexões WA** | Gerenciar instâncias + QR Code |
| **Filas** | Criar e gerenciar filas de atendimento |
| **Webhooks** | Configurar Evolution Go + n8n + Asaas |
| **Usuários** | Cadastro com hierarquia e permissões |
| **Academy** | Vídeo-aulas estilo Netflix para onboarding |
| **Configurações** | Planos, SMTP, Pagamentos, Segurança, Logs |

---

## 📦 Planos disponíveis

| Plano | Preço | Instâncias | Usuários |
|---|---|---|---|
| Free | R$ 0/mês | 1 | 1 |
| Pro Mensal | R$ 97/mês | 3 | 5 |
| Pro Anual | R$ 797/ano | 10 | Ilimitado |

---

## 📄 Licença

Projeto privado — SOS Super MKT. Todos os direitos reservados.
