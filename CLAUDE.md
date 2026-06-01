# SOS Super MKT — supercrmzap

## O que é este projeto

Repositório central de ferramentas de marketing digital do SOS Super MKT.
Contém código-fonte, executáveis e extensões de 7 ferramentas organizadas
em pastas padronizadas dentro de `ferramentas/`.

O painel central (`index.html`) lista e descreve todas as ferramentas com
modais detalhados, busca ao vivo e design dark responsivo.

## Estrutura de pastas

```
supercrmzap/
├── index.html              # Painel central SOS Super MKT
├── CLAUDE.md               # Este arquivo — contexto do projeto
├── .gitignore
└── ferramentas/
    ├── sms-mkt/            # aguardando arquivos
    ├── instabot/           # InstaBot Pro v5.0 — .exe Windows (Delphi + Chrome)
    ├── facebook-mkt/       # 2 extensões Chrome MV2 (Auto Join Groups + Postador)
    ├── telegram-mkt/       # Bot Telegram Sender — extensão Chrome MV2
    ├── whatsapp-mkt/       # MassWhatsAppSender — .NET 4.6 + ChromeDriver
    ├── email-mkt/          # UltraMailer v3.5 — .exe Windows (Delphi/VCL)
    └── whatsapp-bot/       # SaaS — Node.js + React + Evolution Go + n8n
        ├── backend/        # Fastify + Prisma + PostgreSQL
        ├── frontend/       # React + Vite + TailwindCSS
        ├── infra/          # Docker Compose (produção completa)
        └── .env.example    # Variáveis de ambiente documentadas
```

## URLs de produção

| Serviço | URL |
|---|---|
| Frontend | https://supercrmapp.openwave.online |
| Backend API | https://supercrmapi.openwave.online |
| WebSocket | wss://supercrmapi.openwave.online/ws |

## Branches

| Branch | Uso |
|---|---|
| `claude/sharp-meitner-bJQMd` | Branch de desenvolvimento ativa |
| `main` | Produção — merge via PR após revisão |

## Regras do repositório

1. **Nunca commitar direto na `main`** — todo trabalho vai na branch de dev
2. **Estrutura obrigatória** — uploads de ferramentas sempre em `ferramentas/<nome>/`
3. **Sem zips na raiz** — extrair antes de commitar
4. **Sem lixo** — não commitar `.pdb`, `Thumbs.db`, `*.log`, `*.tmp`
5. **Padrão de commits:** `feat:` / `refactor:` / `fix:` / `docs:` + descrição curta em pt-BR
6. **Idioma:** toda a plataforma (UI, API, eventos WS, erros) em português do Brasil

## Ferramentas — status atual

| # | Pasta | Ferramenta | Status | Tipo |
|---|---|---|---|---|
| 01 | `sms-mkt/` | SMS MKT | ⏳ aguardando arquivos | .exe Windows |
| 02 | `instabot/` | Instabot Pro v5.0 | ✅ disponível | .exe Windows |
| 03 | `facebook-mkt/` | Facebook MKT | ✅ disponível | Chrome Extension MV2 |
| 04 | `telegram-mkt/` | Telegram MKT | ✅ disponível | Chrome Extension MV2 |
| 05 | `whatsapp-mkt/` | WhatsApp MKT | ✅ disponível | .exe Windows (.NET 4.6) |
| 06 | `email-mkt/` | Email MKT | ✅ disponível | .exe Windows (Delphi) |
| 07 | `whatsapp-bot/` | WhatsApp Bot | 🔧 em integração final | SaaS Web |

## Plano de ação

### Fase 1 — Consolidação ✅ concluída
- [x] Criar `CLAUDE.md`
- [x] Adicionar `.gitignore`
- [x] Merge da branch de trabalho no `main`

### Fase 2 — Painel funcional ✅ concluída
- [x] Atualizar `index.html` com links/downloads reais por ferramenta
- [x] Publicar painel via GitHub Actions → GitHub Pages
- [ ] Adicionar `README.md` por ferramenta (opcional)

### Fase 3 — SMS MKT ⏳ aguardando
- [ ] Receber e organizar arquivos em `ferramentas/sms-mkt/`
- [ ] Atualizar status no painel e no `CLAUDE.md`

### Fase 4 — WhatsApp Bot (SaaS) 🔧 em progresso
- [x] Stack definida: Fastify + Prisma + PostgreSQL + Redis + React + Evolution Go
- [x] Schema Prisma completo (12 models: Tenant, User, WaInstance, Contact, Conversation, Message, KanbanBoard, KanbanCard, Schedule, Subscription, Webhook, ActionsLog)
- [x] Backend: Auth (login, esqueci senha, redefinir senha), CORS, JWT
- [x] Backend: CRUD Contatos, Conversas, Mensagens (texto e mídia)
- [x] Backend: Instâncias WhatsApp (criar, conectar, QR, remover)
- [x] Backend: Kanban (boards, cards, mover com drag-and-drop)
- [x] Backend: Agenda de mensagens com worker de disparo automático (30s)
- [x] Backend: Gestão de usuários (admin only, CRUD completo)
- [x] Backend: Webhook Evolution Go (auto-save contato, auto-criação conversa, deduplicação)
- [x] Backend: Webhook Asaas (pagamento recebido, vencido, renovação)
- [x] Backend: WebSocket multi-tenant por sala (tenantId)
- [x] Frontend: todas as páginas em pt-BR (Atendimentos, Kanban, Contatos, Conexões, Agenda, Dashboard, Usuários)
- [x] Frontend: Layout com sidebar, status WS, seção admin condicional
- [x] Frontend: Páginas de autenticação (Login, Esqueci Senha, Redefinir Senha)
- [x] Integração Evolution Go API com helpers tipados em português
- [x] Docker Compose completo (postgres, redis, evolution-go, minio, n8n, backend, scheduler, frontend)
- [x] Dockerfiles backend (Node + Prisma) e frontend (Vite build + Nginx)
- [x] .env.example documentado para backend e frontend
- [ ] Deploy no servidor (supercrmapi/supercrmapp.openwave.online)
- [ ] Configurar SSL/TLS com reverse proxy (Nginx ou Traefik)
- [ ] Cadastrar primeiro tenant e usuário admin via seed ou painel

## Contato do projeto

- **Repositório:** `rodneicalixto-prog/supercrmzap`
- **Responsável:** rodneicalixto@gmail.com
