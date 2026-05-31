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
    └── whatsapp-bot/       # SaaS em desenvolvimento — Node.js + React + n8n + Supabase
```

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

## Ferramentas — status atual

| # | Pasta | Ferramenta | Status | Tipo |
|---|---|---|---|---|
| 01 | `sms-mkt/` | SMS MKT | ⏳ aguardando arquivos | .exe Windows |
| 02 | `instabot/` | Instabot Pro v5.0 | ✅ disponível | .exe Windows |
| 03 | `facebook-mkt/` | Facebook MKT | ✅ disponível | Chrome Extension MV2 |
| 04 | `telegram-mkt/` | Telegram MKT | ✅ disponível | Chrome Extension MV2 |
| 05 | `whatsapp-mkt/` | WhatsApp MKT | ✅ disponível | .exe Windows (.NET 4.6) |
| 06 | `email-mkt/` | Email MKT | ✅ disponível | .exe Windows (Delphi) |
| 07 | `whatsapp-bot/` | WhatsApp Bot | ⚙️ em desenvolvimento | SaaS Web |

## Plano de ação

### Fase 1 — Consolidação ✅ concluída
- [x] Criar `CLAUDE.md`
- [x] Adicionar `.gitignore`
- [x] Merge da branch de trabalho no `main`

### Fase 2 — Painel funcional
- [ ] Atualizar `index.html` com links/downloads reais por ferramenta
- [ ] Publicar painel via GitHub Pages
- [ ] Adicionar `README.md` por ferramenta com instruções de instalação e uso

### Fase 3 — SMS MKT
- [ ] Receber e organizar arquivos em `ferramentas/sms-mkt/`
- [ ] Atualizar status no painel e no `CLAUDE.md`

### Fase 4 — WhatsApp Bot (SaaS)
- [ ] Definir stack e arquitetura final
- [ ] Desenvolver módulos: Auth · CRM · Kanban · Agenda · Pagamentos (Asaas)
- [ ] Integrar Evolution Go API + n8n webhooks
- [ ] Deploy com Docker + Supabase

## Contato do projeto

- **Repositório:** `rodneicalixto-prog/supercrmzap`
- **Responsável:** rodneicalixto@gmail.com
