# SOS Super MKT (supercrmzap) — Estado Atual

> **Este é o único lugar pra perguntar "onde estamos".** Atualize a cada
> retomada de trabalho. Estrutura/stack em `CLAUDE.md`.

**Repositório:** `rodneicalixto-prog/supercrmzap` — privado.
**Branch padrão:** `claude/sharp-meitner-bJQMd` (não é `main` — ver seção
abaixo). **Última atualização deste arquivo:** 2026-09-28.

---

## ⚠️ Arquivamento equivocado — corrigido em 28/09/2026

Este repositório foi **arquivado de verdade no GitHub** (`isArchived: true`)
em 18/09/2026, na mesma sessão que também arquivou o `megacrm` por engano
(ver `megacrm-doc-consolidation.md` na memória do JARVIS). O banner dizia:

> "Motivo do arquivamento: SOS Super MKT — bundle majoritariamente de
> binários; SaaS WhatsApp em estado placeholder."

**Investigação (28/09/2026):**
- A parte "bundle majoritariamente de binários" **procede** — 5 das 6
  ferramentas em `ferramentas/` são pacotes de executáveis/extensões
  (~105MB de 216MB do repo): `instabot` (.exe Delphi), `facebook-mkt`
  (extensões Chrome), `telegram-mkt` (extensão Chrome), `whatsapp-mkt`
  (.NET + ChromeDriver), `email-mkt` (.exe Delphi).
- A parte **"SaaS WhatsApp em estado placeholder" não procede** — o
  `whatsapp-bot` é um SaaS real (Fastify + Prisma + React, multi-tenant:
  Tenants/Users/Instances/Queues/Schedules/Kanban) que **teve URL de
  produção própria** (`supercrmapp.openwave.online` /
  `supercrmapi.openwave.online`, hoje fora do ar). O código-fonte é
  modesto (343KB) mas funcional, não um placeholder vazio.
- Confirmado com o usuário: **é um produto diferente do SmartZap**, não
  redundante — mesmo veredito do caso megacrm.

**Ação tomada:** `gh repo unarchive` executado com confirmação explícita do
usuário. Banner removido do `README.md`. Repositório **ativo** de novo.

## Estrutura de branches — atenção

Não existe trabalho relevante recente em `main` (parado em 31/05/2026). O
branch padrão do GitHub é `claude/sharp-meitner-bJQMd`, que tem **6167
linhas a mais que o `main`** — é onde o `whatsapp-bot` ganhou Instances,
Kanban, Logs, Queues, Schedules, Tenants, Users e as migrations de infra.
**Trabalhar em `claude/sharp-meitner-bJQMd`, não em `main`**, até decidir
se vale mergear/renomear pra `main` de verdade.

| Branch | Último commit | Conteúdo |
|---|---|---|
| `main` | 31/05/2026 | Versão inicial do whatsapp-bot, bem mais simples |
| `claude/sharp-meitner-bJQMd` (padrão) | 18/09/2026 (banner) / 01/06/2026 (última feature) | Versão completa — multi-tenant, filas, agendamentos |

## O que existe

```
supercrmzap/
├── index.html              painel central SOS Super MKT (busca, modais)
├── CLAUDE.md
├── ferramentas/
│   ├── instabot/            InstaBot Pro v5.0 — .exe Windows (Delphi+Chrome)
│   ├── facebook-mkt/        2 extensões Chrome MV2
│   ├── telegram-mkt/        Bot Telegram Sender — extensão Chrome MV2
│   ├── whatsapp-mkt/        MassWhatsAppSender — .NET 4.6 + ChromeDriver
│   ├── email-mkt/           UltraMailer v3.5 — .exe Windows (Delphi/VCL)
│   ├── sms-mkt/             [A PREENCHER] CLAUDE.md diz "aguardando arquivos" — conferir se ainda vale
│   └── whatsapp-bot/        SaaS real — Fastify + Prisma + React + Evolution Go + n8n
│       ├── backend/         Fastify + Prisma + PostgreSQL
│       ├── frontend/        React + Vite + Tailwind (Tenants/Users/Instances/Queues/Schedules/Kanban)
│       └── infra/           Docker Compose produção
```

## Pausado — não confundir com "morto"

Último commit de feature real: 01/06/2026 (`d9813f9`). URLs de produção do
`whatsapp-bot` não respondem hoje (timeout em ambas). **Não confirmado**
se foram desligadas de propósito (parte do processo de arquivamento
equivocado) ou se caíram por outro motivo — `[A PREENCHER]`.

## Perguntas em aberto

1. As URLs de produção (`supercrmapp`/`supercrmapi.openwave.online`) vão
   voltar a subir, ou o projeto fica só no código por enquanto?
2. `main` vs `claude/sharp-meitner-bJQMd` — vale renomear o branch
   completo pra `main` (ele é estritamente mais avançado), ou existe algum
   motivo pra manter separado?
3. `ferramentas/sms-mkt` — "aguardando arquivos" ainda vale, ou pode
   remover a pasta vazia?
4. As 5 ferramentas de binário (105MB) precisam mesmo estar neste repo
   Git, ou fariam mais sentido em Releases/armazenamento separado? (Não é
   urgente, só ficou registrado ao notar o tamanho do repo.)

## Mapa de documentos deste repo

| Arquivo | Papel |
|---|---|
| `STATUS.md` (este arquivo) | Estado atual — único lugar de "onde estamos" |
| `CLAUDE.md` | Estrutura de pastas, URLs, stack de cada ferramenta |
| `CONTEXT.md` | Resumo curto, desatualizado ("Em desenvolvimento inicial", 01/06) — considerar fundir com STATUS.md numa próxima rodada |
| `index.html` | Painel central (não é doc, é o produto) |
