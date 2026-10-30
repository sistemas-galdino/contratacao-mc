# Vetor — sistema de contratação

Instruções para assistentes de IA (Claude Code, Codex e similares) que trabalham neste repositório.
Quem usa este repositório normalmente **não é programador**: fale em português simples e explique o que
vai fazer antes de fazer.

## O que a pessoa pode pedir e o que fazer

| Pedido | O que fazer |
| --- | --- |
| "configure / instale o sistema", "/configurar" | Leia `docs/agente/configurar.md` e siga do começo ao fim. |
| "adicione a Maria (maria@empresa.com)" | `npm run usuario:adicionar -- --email ... --nome "..."` (`--dono` se for administrador). Mostre a senha gerada. |
| "quem tem acesso?" | `npm run usuario:listar` |
| "troque a senha de ..." | `npm run usuario:senha -- --email ...` (ou `--senha "..."` se ela escolher). |
| "tire o acesso de ..." | Confirme antes. `npm run usuario:remover -- --email ...` |
| "mude o nome da empresa" | `npm run empresa -- --nome "..."` |
| "atualize o sistema" | Siga `docs/agente/atualizar.md`. |
| "publique / publique de novo" | `npm run publicar` (passo 7 de `docs/agente/configurar.md`). |
| "algo não funciona" | Rode `npm run verificar` primeiro; ele aponta o problema. |

Se ainda não existir `.env`, o sistema não foi configurado: ofereça rodar o roteiro de configuração.

## Regras

- Segredos ficam só no `.env` (ignorado pelo Git). Nunca faça commit de chaves, nunca as cole em
  arquivos versionados e não as mostre inteiras na conversa.
- `SUPABASE_SERVICE_ROLE_KEY` é usada só pelos scripts em `scripts/` na máquina de quem administra.
  Não a use em código do navegador nem a envie para o servidor publicado.
- Nunca apague projetos, bancos ou dados sem confirmação explícita da pessoa.
- Ao mudar o processo de instalação, atualize juntos `docs/INSTALACAO.md` (pessoas),
  `docs/agente/configurar.md` (assistentes) e o PDF (`npm run guia:pdf`, gerado a partir do INSTALACAO.md).
- Mudanças no banco entram como novas migrações em `supabase/migrations/` (nunca edite as antigas) e
  são aplicadas com `npm run db:aplicar`. Depois, atualize `src/integrations/supabase/types.ts`
  (`npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`).

## Como o sistema funciona

- **Stack:** TanStack Start (React 19 + Vite), Tailwind 4, Supabase (Postgres, Auth, Storage),
  OpenAI pela Responses API (`src/lib/ai-gateway.server.ts`, modelo em `OPENAI_MODEL`).
- **Publicação:** Vercel (`npm run publicar` → `scripts/publicar.mjs`). O script envia as variáveis do
  `.env` para o projeto no Vercel (as `VITE_*` entram no build; `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `OPENAI_API_KEY` e `OPENAI_MODEL` ficam para o servidor) e faz o deploy de produção; o build roda no
  Vercel (`vercel.json`, região `gru1`). O `.vercelignore` impede que o `.env` seja enviado.
- **Acesso:** uma empresa por instalação. Não há cadastro aberto: o administrador libera cada pessoa
  (`scripts/admin.mjs`). `bootstrap_current_user` (SQL) devolve a empresa de quem está logado e barra
  contas sem vínculo (erro 42501 → tela "Acesso não liberado").
- **Candidatos** não têm conta: usam o link público da vaga (`/vaga/:jobId`), o link de acompanhamento
  (`/acompanhar/:token`) e o do case (`/case/:token`), todos via funções `security definer`.
- **Currículos** ficam no bucket privado `curriculos`; a equipe abre por link temporário.
- Assessment scoring lives in `src/lib/assessment-scoring.ts` (0–100 per option, per-skill averages,
  importance-weighted compatibility); why: one source for recruiter view, persistence and interview input.

## Comandos

```
npm run dev            # sistema em http://localhost:8080
npm run build          # build de produção
npm run lint           # ESLint
npx tsc --noEmit       # checagem de tipos
npm run verificar      # confere a instalação (.env, banco, chaves, OpenAI)
npm run db:aplicar     # aplica migrações novas no Supabase vinculado
npm run publicar       # publica no Vercel
```
