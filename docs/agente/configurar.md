# Roteiro de configuração — instruções para o assistente

> Este arquivo é para o assistente de IA (Claude Code, Codex ou similar). A pessoa só precisa pedir
> "configure o sistema" — ou digitar `/configurar` no Claude Code. Quem segue o guia
> (`docs/INSTALACAO.md`) chega aqui pelo "Prompt 2", que já traz as respostas do passo 1.

Você vai instalar o sistema de contratação (Vetor) no Supabase da pessoa, deixar tudo funcionando no
computador dela e, se ela quiser, publicar na internet. Ela provavelmente não é programadora.

## Como conduzir

- Fale em português simples. Antes de cada etapa, diga em uma frase o que vai fazer e por quê.
- Faça você mesmo tudo o que der para fazer pelo terminal. Só peça ação da pessoa quando for
  inevitável: criar conta, gerar token/chave, fazer login no navegador.
- Faça as perguntas de cadastro todas juntas (passo 1), só as que a pessoa ainda não respondeu.
  Depois disso, peça uma coisa de cada vez.
- Logins pelo navegador (`gh auth login --web`, `npx vercel login`): rode o comando em segundo plano,
  leia a saída, passe o link e o código para a pessoa e espere o comando terminar sozinho.
- **Segredos:** chaves e tokens só vão para o `.env` (ignorado pelo Git) — nunca para arquivos versionados,
  commits ou mensagens. Na conversa, mostre no máximo o começo (`sb_secret_ab12…`). A única exceção é a
  senha do administrador gerada no passo 5, que a pessoa precisa anotar.
- Nunca apague projetos, bancos ou dados existentes sem a pessoa confirmar por escrito.
- `npm run verificar` diz exatamente o que falta. Se já existir um `.env`, rode-o antes de tudo e
  continue a partir do primeiro item com ✖ (a instalação pode ter sido interrompida).
- Se um comando falhar: leia a mensagem, procure em "Problemas comuns" (fim deste arquivo), explique em
  uma frase o que aconteceu e tente a correção. Só peça ajuda depois disso.
- No Windows, rode os mesmos comandos no PowerShell; os scripts do projeto funcionam igual.
- No Codex, comandos que acessam a internet podem pedir aprovação: avise a pessoa para aprovar.

## Passo 0 — Preparar a máquina

Instale você mesmo o que faltar. Prefira caminhos que não peçam a senha do computador; quando algum
pedir (ou abrir uma janela), avise antes o que vai aparecer.

1. **Node.js** — `node -v` precisa ser **20.19 ou mais novo** (recomendado 22 ou 24).
   - Mac/Linux: `brew install node@22` se houver Homebrew; sem Homebrew, use o fnm:
     `curl -fsSL https://fnm.vercel.app/install | bash -s -- --force-no-brew`, depois
     `fnm install 22` e `fnm default 22`. Se o `node` não aparecer nos comandos seguintes, carregue o
     fnm no mesmo comando (`eval "$(fnm env)"`, com o caminho completo do `fnm` se preciso) ou peça para
     a pessoa fechar e abrir o assistente.
   - Windows: `winget install --id OpenJS.NodeJS.LTS -e` (pode abrir uma janela pedindo permissão).
   - Último recurso: instalador LTS em https://nodejs.org (pede a senha do computador).
2. **Git** — `git --version`. No Mac sem Git, o comando abre uma janela para instalar as "ferramentas de
   linha de comando" (ou rode `xcode-select --install`): peça para a pessoa clicar em **Instalar** e
   avisar quando terminar. Windows: `winget install --id Git.Git -e`.
3. **Baixar o sistema** — só se você ainda não estiver dentro do repositório:
   - GitHub CLI: `brew install gh`; sem Homebrew, baixe o zip para macOS de
     https://github.com/cli/cli/releases/latest e coloque o binário em `~/.local/bin`; Windows:
     `winget install --id GitHub.cli -e`.
   - `gh auth login --web --hostname github.com --git-protocol https` em segundo plano: a saída mostra
     um código e o link https://github.com/login/device. A pessoa abre, cola o código e autoriza.
   - `gh auth setup-git`, depois `gh repo clone sistemas-galdino/contratacao-mc` e entre na pasta.
     Se o repositório não for encontrado, a pessoa ainda não aceitou o convite (veja "Problemas comuns").
4. `npm install` (instala o sistema e as ferramentas do Supabase e do Vercel dentro do projeto).
5. Se existir `.env`: `npm run verificar` e pule para o passo correspondente ao que falta.

## Passo 1 — Perguntas (uma mensagem só)

Pergunte só o que a pessoa ainda não respondeu.

1. **Nome da empresa**, como deve aparecer no sistema.
2. **Nome e e-mail de quem vai administrar** (recebe o primeiro acesso).
3. **Supabase:** já tem conta em supabase.com? Prefere que você **crie um projeto novo** (recomendado)
   ou usar um projeto existente **vazio**?
4. **Chave da OpenAI** (opcional): sem ela o sistema funciona, mas sem os recursos de IA. Cria-se em
   https://platform.openai.com/api-keys e a conta precisa ter crédito. Ela pode mandar depois.
5. **Publicar na internet agora** (Vercel) ou só testar no computador por enquanto? Explique: para
   candidatos se inscreverem pelo link da vaga, o sistema precisa estar publicado. O plano grátis do
   Vercel (Hobby) serve para testar; para uso pela empresa, os termos do Vercel exigem o plano Pro
   (US$ 20/mês).

## Passo 2 — Acesso ao Supabase

1. Peça o token de acesso pessoal:
   - entrar em https://supabase.com/dashboard/account/tokens (criar conta grátis se ainda não tiver);
   - **Generate new token** → nome `instalacao-contratacao` → copiar (começa com `sbp_`) e colar aqui.
2. `npx supabase login --token <TOKEN>` (guarda o login da ferramenta do Supabase nesta máquina; é o
   que permite aplicar atualizações do banco no futuro).
3. Teste: `npx supabase orgs list` deve listar a(s) organização(ões) da conta.

Além desse login, os scripts recebem o token por `--token <TOKEN>` e não o gravam em outro lugar.
Nunca coloque o token no `.env` nem em arquivos do projeto.

## Passo 3 — Escolher ou criar o projeto

**Projeto novo (recomendado)**

1. `npx supabase orgs list` → se houver mais de uma organização, pergunte qual usar.
2. Gere a senha do banco: `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`
3. `npx supabase projects create "contratacao-<nome-curto>" --org-id <ORG_ID> --db-password <SENHA> --region sa-east-1`
   (`sa-east-1` = São Paulo.)
4. Anote o **ref** do projeto (20 letras/números) — aparece na saída e em `npx supabase projects list`.

**Projeto existente**

1. `npx supabase projects list` → mostre nome e região e pergunte qual usar.
2. O passo 4 recusa projetos que já têm outras tabelas. Se acontecer, recomende um projeto novo.

## Passo 4 — Ligar o sistema ao projeto

```
npm run supabase:conectar -- --ref <REF> --token <TOKEN> [--senha-banco <SENHA>]
```

Passe `--senha-banco` só quando você mesmo criou o projeto no passo 3. O script:

- espera o projeto ficar pronto (projetos novos levam de 1 a 3 minutos);
- cria as tabelas do sistema (migrações em `supabase/migrations`);
- busca as chaves de API e preenche o `.env`;
- desliga o cadastro aberto de contas (só o administrador libera acessos).

**Chave da OpenAI:** se a pessoa disse que vai mandar, peça agora, com o caminho:
https://platform.openai.com/api-keys → **Create new secret key** → copiar (começa com `sk-`) e colar
aqui; em **Settings → Billing**, adicionar crédito. Grave-a no `.env` em `OPENAI_API_KEY=` (edite a linha
existente; não mostre a chave na conversa). Se ela não tiver agora, siga sem: dá para mandar depois.

## Passo 5 — Empresa e administrador

1. `npm run empresa -- --nome "<Nome da empresa>"`
2. `npm run usuario:adicionar -- --email <email> --nome "<Nome completo>" --dono`
   - O comando gera e mostra uma senha. Mostre **endereço, e-mail e senha** para a pessoa e peça para
     anotar num lugar seguro.
3. `npm run verificar` → tudo com ✔ (o aviso da OpenAI só aparece se ela ainda não tiver a chave).
   Se o modelo da OpenAI não estiver disponível na conta dela, veja "Problemas comuns".

## Passo 6 — Testar no computador

Se ela vai publicar agora, pule este passo: o teste é feito no endereço publicado (passo 7.5).

1. Inicie `npm run dev` **em segundo plano** e aguarde aparecer o endereço (normalmente
   http://localhost:8080; se a porta estiver ocupada, o terminal mostra outra).
2. Peça para a pessoa abrir o endereço, entrar com e-mail e senha e conferir o nome da empresa no topo.
3. Sugira preencher **Configurações** (dados, cultura e documentos da empresa — a IA usa isso) e criar
   uma vaga de teste.

Se ela não quiser publicar agora, pule para o passo 8.

## Passo 7 — Publicar na internet (Vercel)

1. Ela precisa de conta em https://vercel.com/signup. Para testar, o plano Hobby (grátis) basta; para a
   empresa usar de verdade, os termos do Vercel pedem o plano Pro.
2. `npx vercel login` — mostra um link e um código. Passe o link para a pessoa abrir, entrar na conta e
   aprovar; o comando termina sozinho depois disso (rode em segundo plano e aguarde, pode levar alguns
   minutos). Se não funcionar, peça para ela rodar no terminal (no Claude Code: digitar
   `! npx vercel login`). Confira com `npx vercel whoami`.
   - Se a conta tiver mais de um time, pergunte em qual publicar e grave o slug em `VERCEL_SCOPE=`
     no `.env`.
3. `npm run publicar` — na primeira vez cria o projeto `contratacao` no Vercel; depois envia as
   variáveis do `.env` e faz o deploy de produção (o build roda no Vercel e leva de 1 a 3 minutos).
4. Na saída, pegue o endereço **curto** de produção, que aparece em `Aliased` (ex.:
   `https://contratacao-xyz.vercel.app`). **Não use** o endereço longo, com letras aleatórias: ele
   fica protegido pelo login do Vercel e os candidatos não conseguiriam abrir. Se não encontrar o
   endereço curto, veja em vercel.com → projeto → **Domains**. Depois rode:
   `npm run supabase:endereco -- --url <ENDEREÇO> --token <TOKEN>`
   (grava `APP_URL` no `.env` e libera o endereço no login do Supabase).
5. Teste numa janela anônima do navegador: o endereço deve abrir a tela de login do sistema, sem
   pedir login do Vercel. Peça para ela entrar. É esse endereço que vai nos links das vagas.

## Passo 8 — Entrega

Resuma para a pessoa:

- endereço do sistema (publicado e/ou local) e e-mail do administrador (a senha ela já anotou);
- como pedir coisas daqui em diante: "adicione a Maria (maria@empresa.com) ao sistema",
  "troque a senha do João", "atualize o sistema", "publique de novo";
- que o arquivo `.env` guarda as chaves desta instalação: não deve ser compartilhado nem apagado;
- que ela pode apagar o token do Supabase em Account → Access Tokens; para atualizações futuras basta
  gerar outro;
- que, se quiser consultar os dados do sistema conversando com você, dá para ligar o conector do
  Supabase (seção abaixo).

## Conector do Supabase (opcional)

Permite que a pessoa pergunte sobre os dados do sistema ("quantos candidatos cada vaga recebeu esta
semana?"). Configure sempre em **somente leitura** e limitado ao projeto do sistema. O conector não
substitui o token na instalação: ele não entrega a chave secreta nem muda as configurações de login.

**Claude Code** — rode dentro da pasta do sistema, com o ref do projeto (`SUPABASE_PROJECT_ID` no
`.env`):

```
claude mcp add --scope local --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<REF>&read_only=true"
```

Depois, a pessoa fecha e abre o Claude Code **dentro da pasta do sistema**, digita `/mcp`, escolhe
**supabase** → **Authenticate** e autoriza no navegador, escolhendo a organização do projeto.

**Codex** — `codex mcp add supabase --url "<o mesmo endereço>"` e depois `codex mcp login supabase`
(abre o navegador). Se a sintaxe tiver mudado, consulte `codex mcp --help`.

Teste pedindo uma consulta simples pelo conector, por exemplo o número de vagas cadastradas.

## Login com Google (opcional)

1. Peça para a pessoa fazer, em https://console.cloud.google.com (com a conta Google da empresa), e
   colar aqui o **ID do cliente** e a **chave secreta do cliente**:
   - criar um projeto (ex.: "Vetor");
   - em **Google Auth Platform** (em contas antigas, "APIs e serviços → Tela de consentimento OAuth"):
     nome do app, e-mail de suporte e público **Externo**; depois, em **Público-alvo**, clicar em
     **Publicar app** (em modo de teste só entram os usuários de teste);
   - em **Clientes** (ou "Credenciais") → **Criar cliente** → **Aplicativo da Web** → em *URIs de
     redirecionamento autorizados*, colar `https://<REF>.supabase.co/auth/v1/callback` (passe o
     endereço pronto, com o ref do `.env`).
2. Ative o Google no Supabase pela API, com o token do Supabase (se não tiver, peça um novo — passo 2):

   ```
   curl -sS -X PATCH "https://api.supabase.com/v1/projects/<REF>/config/auth" \
     -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"external_google_enabled":true,"external_google_client_id":"<ID>","external_google_secret":"<SEGREDO>"}'
   ```

   Não grave o ID nem o segredo em arquivos do projeto: eles ficam só no Supabase.
3. Grave `VITE_GOOGLE_LOGIN=true` no `.env` e rode `npm run publicar`.
4. Peça para a pessoa testar: a tela de login mostra "Continuar com o Google". Só entra quem já está
   cadastrado no sistema com o mesmo e-mail.

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| `node` instalado, mas "command not found" | O terminal ainda não enxerga o Node novo: carregue o fnm no comando (`eval "$(fnm env)"`) ou peça para a pessoa fechar e abrir o assistente. |
| `gh auth login` não termina | A pessoa ainda não autorizou ou o código expirou (15 minutos). Rode de novo e passe o código novo. Se não funcionar, peça para ela rodar no terminal (no Claude Code: `! gh auth login --web`). |
| Clone: repositório não encontrado | Ela precisa aceitar o convite em https://github.com/sistemas-galdino/contratacao-mc/invitations (com a mesma conta do GitHub). Se ainda não recebeu, peça para enviar o usuário do GitHub a quem passou o sistema. |
| `npm install` falha | Confira `node -v` (≥ 20.19). Atualize o Node e rode de novo. |
| `projects create` fala em limite de projetos gratuitos | O plano grátis permite 2 projetos ativos. Peça para pausar/apagar um antigo no painel do Supabase ou usar outra organização. |
| `supabase:conectar` diz que o projeto tem outras tabelas | O projeto não está vazio. Crie um projeto novo (passo 3). Só use `--forcar` se a pessoa confirmar. |
| `supabase:conectar` falha em `link` ou `db push` pedindo senha | Peça a senha do banco (Supabase → Project Settings → Database; pode redefinir lá) e rode de novo com `--senha-banco`. |
| Token inválido ou expirado | Gere outro token (passo 2) e repita o comando. |
| `verificar`: modelo da OpenAI indisponível | Liste os modelos da conta: `curl https://api.openai.com/v1/models -H "Authorization: Bearer <CHAVE>"`. Escolha um modelo de texto recente, grave em `OPENAI_MODEL=` no `.env`, rode `npm run verificar` e, se já publicado, `npm run publicar`. |
| Login: "E-mail ou senha incorretos" | `npm run usuario:senha -- --email <email>` gera uma senha nova. |
| Tela "Acesso não liberado" | A conta não está na equipe: `npm run usuario:adicionar -- --email <email> --nome "<nome>"`. |
| Publicado, mas a IA não responde | Confira `OPENAI_API_KEY` no `.env` e rode `npm run publicar` de novo (ele reenvia as variáveis). |
| `npm run publicar` pede login | Rode `npx vercel login` (passo 7). |
| Endereço publicado pede login do Vercel | Use o endereço curto de produção (passo 7.4). Se mesmo ele pedir login: vercel.com → projeto → Settings → Deployment Protection → desligue "Vercel Authentication". |
| Deploy falha falando em região (`gru1`) | Apague a linha `"regions"` do `vercel.json` e rode `npm run publicar` de novo. |
| Página publicada mostra erro de Supabase | Faltaram variáveis no build: rode `npm run publicar` de novo e confira em vercel.com → projeto → Settings → Environment Variables. |
