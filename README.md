# Vetor — sistema de contratação

Sistema completo para conduzir processos seletivos: cadastro de vagas com apoio de IA, formulário público
para candidatos, assessment, entrevistas, case técnico, análise de compatibilidade e acompanhamento do
candidato por link individual.

Cada empresa instala o sistema na **própria conta do Supabase** (banco de dados) e publica no **próprio
Cloudflare** (gratuito). A configuração técnica é feita por um assistente de IA — **Claude Code** ou
**Codex** — a partir deste repositório.

## Instalação rápida

1. Instale [Node.js](https://nodejs.org) (versão LTS) e o [Claude Code](https://claude.com/claude-code)
   ou o [Codex](https://developers.openai.com/codex).
2. Baixe este repositório (GitHub Desktop → *Clone repository*, ou `git clone`).
3. Abra a pasta do projeto no assistente:
   - **Claude Code:** rode `claude` dentro da pasta e digite **`/configurar`**
   - **Codex:** rode `codex` dentro da pasta e peça **"configure o sistema"**
4. Responda às perguntas. O assistente cria o banco, cadastra sua empresa e o administrador, testa e
   publica.

O passo a passo completo, com o caminho de cada clique em cada serviço, está em
[`docs/INSTALACAO.md`](docs/INSTALACAO.md) e no PDF [`docs/Guia-de-Instalacao.pdf`](docs/Guia-de-Instalacao.pdf).

## Depois de instalado

Peça ao assistente, em português:

| Você diz | O que acontece |
| --- | --- |
| "Adicione a Maria (maria@empresa.com) ao sistema" | Cria o acesso e mostra a senha |
| "Quem tem acesso?" | Lista a equipe |
| "Troque a senha do João" | Gera uma senha nova |
| "Atualize o sistema" (`/atualizar`) | Baixa a versão nova, atualiza o banco e republica |
| "Publique de novo" (`/publicar`) | Republica no Cloudflare |
| "Algo não está funcionando" | Roda `npm run verificar` e corrige |

## O que você precisa ter

| Serviço | Para quê | Custo |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Banco de dados, login e arquivos | Grátis (até 2 projetos) |
| [Cloudflare](https://dash.cloudflare.com/sign-up) | Deixar o sistema na internet | Grátis |
| [OpenAI](https://platform.openai.com) | Recursos de IA (opcional) | Pago por uso |
| Claude Code ou Codex | Assistente que faz a instalação | Assinatura do Claude ou do ChatGPT |

## Para quem desenvolve

```
npm install
cp .env.example .env     # ou use o /configurar
npm run dev              # http://localhost:8080
npm run verificar        # confere .env, banco, chaves e OpenAI
npm run db:aplicar       # aplica migrações no Supabase vinculado
npm run publicar         # build + deploy no Cloudflare Workers
npm run guia:pdf         # regenera docs/Guia-de-Instalacao.pdf a partir de docs/INSTALACAO.md
```

- Stack: TanStack Start (React 19 + Vite), Tailwind 4, Supabase, OpenAI (Responses API).
- Banco: `supabase/migrations/` (aplicadas em ordem pela CLI do Supabase).
- Scripts de administração: `scripts/admin.mjs` (empresa e equipe), `scripts/supabase.mjs`
  (ligar a um projeto), `scripts/publicar.mjs` (deploy).
- Instruções para assistentes de IA: `AGENTS.md` e `docs/agente/`.
