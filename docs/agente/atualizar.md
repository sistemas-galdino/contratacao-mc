# Roteiro de atualização — instruções para o assistente

Use quando a pessoa pedir para atualizar o sistema para a versão mais nova do repositório.

1. `git status` — se houver arquivos alterados (fora o `.env`, que é ignorado), mostre quais são e
   pergunte se pode guardá-los com `git stash` antes de continuar. Não descarte nada sem confirmação.
2. `git pull` — se pedir login do GitHub, a pessoa precisa ter acesso ao repositório original.
3. `npm install`
4. Banco de dados: `npm run db:aplicar` aplica só as migrações novas.
   - Se a ferramenta do Supabase pedir login, peça um token novo (passo 2 de `docs/agente/configurar.md`)
     e rode `npx supabase login --token <TOKEN>`.
   - Se reclamar que o projeto não está vinculado: `npx supabase link --project-ref <SUPABASE_PROJECT_ID do .env>`.
5. `npm run verificar` — tudo precisa estar com ✔.
6. Se o sistema estiver publicado (`APP_URL` preenchido no `.env`): `npm run publicar`.
7. Conte para a pessoa o que mudou (resuma `git log --oneline` desde a versão anterior).
