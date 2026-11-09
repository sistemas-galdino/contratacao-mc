# Vetor — sistema de contratação

Sistema completo para conduzir processos seletivos: cadastro de vagas com apoio de IA, formulário público
para candidatos, assessment, entrevistas, case técnico, análise de compatibilidade e acompanhamento do
candidato por link individual.

Cada empresa instala o sistema na **própria conta do Supabase** (banco de dados) e publica na **própria
conta do Vercel**. A configuração técnica é feita por um assistente de IA — **Claude Code** ou
**Codex** — a partir deste repositório.

## Instalação rápida

Siga o guia [`docs/Guia-de-Instalacao.pdf`](docs/Guia-de-Instalacao.pdf) (fonte:
[`docs/INSTALACAO.md`](docs/INSTALACAO.md)). Ele traz prompts prontos para colar no Claude Code:

1. Crie as contas (GitHub, Supabase, Vercel e, se quiser IA, OpenAI) e abra o Claude Code.
2. **Prompt 1:** o Claude instala Node, Git e GitHub CLI, faz o login no GitHub e baixa o sistema.
3. **Prompt 2:** o Claude cria o banco no Supabase, cadastra a empresa e o administrador e publica no
   Vercel. Você só cola o token do Supabase, a chave da OpenAI e autoriza o login do Vercel.

Já tem o repositório baixado? Abra a pasta no assistente e peça **"configure o sistema"** (no Claude
Code, **`/configurar`**). O mesmo vale para o **Codex**.

## Depois de instalado

Peça ao assistente, em português:

| Você diz | O que acontece |
| --- | --- |
| "Adicione a Maria (maria@empresa.com) ao sistema" | Cria o acesso e mostra a senha |
| "Quem tem acesso?" | Lista a equipe |
| "Troque a senha do João" | Gera uma senha nova |
| "Atualize o sistema" (`/atualizar`) | Baixa a versão nova, atualiza o banco e republica |
| "Publique de novo" (`/publicar`) | Republica no Vercel |
| "Algo não está funcionando" | Roda `npm run verificar` e corrige |

## O que você precisa ter

| Serviço | Para quê | Custo |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Banco de dados, login e arquivos | Grátis (até 2 projetos) |
| [Vercel](https://vercel.com/signup) | Deixar o sistema na internet | Grátis para testar (Hobby); uso comercial exige o Pro, US$ 20/mês |
| [OpenAI](https://platform.openai.com) | Recursos de IA (opcional) | Pago por uso |
| Claude Code ou Codex | Assistente que faz a instalação | Assinatura do Claude ou do ChatGPT |

## Para quem desenvolve

```
npm install
cp .env.example .env     # ou use o /configurar
npm run dev              # http://localhost:8080
npm run verificar        # confere .env, banco, chaves e OpenAI
npm run db:aplicar       # aplica migrações no Supabase vinculado
npm run publicar         # envia as variáveis e publica no Vercel
npm run guia:pdf         # regenera docs/Guia-de-Instalacao.pdf a partir de docs/INSTALACAO.md
```

- Stack: TanStack Start (React 19 + Vite), Tailwind 4, Supabase, OpenAI (Responses API).
- Banco: `supabase/migrations/` (aplicadas em ordem pela CLI do Supabase).
- Scripts de administração: `scripts/admin.mjs` (empresa e equipe), `scripts/supabase.mjs`
  (ligar a um projeto), `scripts/publicar.mjs` (deploy no Vercel).
- Instruções para assistentes de IA: `AGENTS.md` e `docs/agente/`.
