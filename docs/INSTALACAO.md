# Guia de instalação do Vetor

Este guia leva você do zero até o sistema de contratação funcionando, no banco de dados da sua empresa e
publicado na internet. A parte técnica é feita por um assistente de IA (Claude Code ou Codex). Você cria
as contas, responde a algumas perguntas e aprova o que ele for fazer.

**Tempo estimado:** de 30 a 45 minutos na primeira vez.

> **Como ler este guia:** os passos marcados com **Você** são feitos por você, no navegador ou no
> terminal. Os marcados com **Assistente** o Claude Code ou o Codex faz sozinho; você só acompanha e
> aprova.

## 1. Antes de começar

Você vai precisar de um computador (Mac, Windows ou Linux) com internet e de contas nestes serviços:

| Serviço | Para quê | Custo | Onde criar |
| --- | --- | --- | --- |
| GitHub | Baixar o sistema | Grátis | github.com/signup |
| Supabase | Banco de dados, login e arquivos | Grátis (até 2 projetos) | supabase.com |
| Vercel | Deixar o sistema na internet | Grátis para testar; Pro (US$ 20/mês) para uso na empresa | vercel.com/signup |
| OpenAI | Recursos de IA do sistema (opcional) | Pago por uso | platform.openai.com |
| Claude **ou** ChatGPT | Usar o Claude Code **ou** o Codex | Assinatura | claude.ai **ou** chatgpt.com |

> **Sobre o Vercel:** o plano grátis (Hobby) é só para uso pessoal e não comercial. Use-o para
> testar; quando a empresa começar a usar o sistema com candidatos de verdade, assine o plano **Pro**.

> **Acesso ao repositório:** o sistema fica num repositório privado no GitHub. Peça acesso a quem te
> enviou o sistema, informando o seu usuário do GitHub, e aceite o convite que chega por e-mail.

## 2. Instalar as ferramentas (Você)

**2.1 Node.js** — o motor que roda o sistema no seu computador.

1. Acesse **nodejs.org** e baixe a versão **LTS**.
2. Instale com as opções padrão.
3. Abra o Terminal (Mac: aplicativo *Terminal*; Windows: *PowerShell*) e digite `node -v`.
   Deve aparecer um número igual ou maior que `v20.19`.

**2.2 Git** — no Mac já vem instalado (se o Mac pedir para instalar as "ferramentas de linha de
comando", aceite). No Windows, baixe em **git-scm.com** e instale com as opções padrão.

**2.3 O assistente de IA** — escolha **um** dos dois.

*Claude Code* (precisa de uma assinatura do Claude: Pro, Max, Team ou Enterprise):

```
# Mac ou Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```

*Codex* (precisa de uma assinatura do ChatGPT: Plus, Pro, Business ou Enterprise):

```
npm install -g @openai/codex
```

Feche e abra o Terminal de novo depois de instalar.

## 3. Baixar o sistema (Você)

**Opção mais simples — GitHub Desktop**

1. Baixe em **desktop.github.com**, instale e entre com sua conta do GitHub.
2. Menu **File → Clone repository** → aba **GitHub.com** → escolha **contratacao-mc** → escolha a pasta
   → **Clone**.
3. Para abrir o Terminal já dentro da pasta: menu **Repository → Open in Terminal** (no Windows,
   *Open in Command Prompt*/*PowerShell*).

**Opção pelo Terminal**

```
git clone https://github.com/sistemas-galdino/contratacao-mc.git
cd contratacao-mc
```

Se o Git pedir login, entre com a sua conta do GitHub (no Windows abre uma janela do navegador; no Mac,
use o GitHub Desktop ou o GitHub CLI: `gh auth login`).

## 4. Abrir o assistente e começar (Você)

Com o Terminal **dentro da pasta do sistema**:

| Claude Code | Codex |
| --- | --- |
| Digite `claude` e faça o login na primeira vez. | Digite `codex` e entre com sua conta do ChatGPT. |
| Digite **`/configurar`** e aperte Enter. | Escreva **configure o sistema** e aperte Enter. |

A partir daqui o assistente conduz. Sempre que ele pedir permissão para rodar um comando, leia a frase
que ele escreveu explicando o que vai fazer e aprove.

> **No Codex**, alguns comandos precisam de acesso à internet e pedem aprovação extra. Aprove quando ele
> pedir para rodar comandos como `npm install` ou `npx supabase`.

## 5. Responder às perguntas (Você)

Logo no começo o assistente pergunta, numa mensagem só:

1. **Nome da empresa**, como deve aparecer no sistema.
2. **Seu nome e e-mail** — você vai ser o administrador.
3. **Supabase:** se já tem conta e se prefere um **projeto novo** (recomendado) ou um projeto existente
   vazio.
4. **Chave da OpenAI** (opcional, pode mandar depois).
5. **Publicar na internet agora** (no Vercel) ou só testar no computador primeiro.

> Para os candidatos se inscreverem pelo link da vaga, o sistema precisa estar publicado. Você pode
> testar no computador primeiro e publicar depois, pedindo `/publicar`.

## 6. Gerar o token do Supabase (Você)

O assistente vai pedir um **token de acesso** para criar e configurar o banco por você.

1. Acesse **supabase.com/dashboard/account/tokens** (crie a conta grátis se ainda não tiver).
2. Clique em **Generate new token**, dê o nome `instalacao-contratacao` e confirme.
3. Copie o token (começa com `sbp_`) e cole na conversa com o assistente.

**O assistente então:** cria o projeto no Supabase (região São Paulo), espera ficar pronto, cria todas
as tabelas, busca as chaves de acesso, grava tudo no arquivo `.env` do seu computador e desliga o
cadastro aberto — só você, como administrador, libera acessos.

> O token fica guardado só no seu computador, na ferramenta do Supabase, para o assistente aplicar as
> atualizações futuras do banco. Ele nunca vai para o GitHub nem para o sistema publicado. Se preferir,
> apague-o depois na mesma página; numa próxima atualização, basta gerar outro.

## 7. Chave da OpenAI — opcional (Você)

Sem esta chave o sistema funciona normalmente, mas sem os recursos de IA (geração do contexto da vaga,
perguntas, assessment, case, roteiro e análise de entrevistas). Nesse caso ele usa sugestões automáticas.

1. Acesse **platform.openai.com/api-keys** e entre com sua conta.
2. Clique em **Create new secret key**, dê um nome e copie a chave (começa com `sk-`).
3. Em **Settings → Billing**, adicione crédito (o uso é cobrado por consumo).
4. Cole a chave na conversa quando o assistente pedir.

## 8. Seu acesso e o teste no computador

**Assistente:** cadastra a empresa, cria o seu acesso de administrador e mostra **e-mail e senha**.

> **Anote a senha num lugar seguro** (por exemplo, no gerenciador de senhas). Ela aparece uma vez só.
> Se perder, é só pedir ao assistente: "troque a minha senha".

**Assistente:** liga o sistema no seu computador.

**Você:** abra **http://localhost:8080** no navegador, entre com o e-mail e a senha e confira se o nome
da sua empresa aparece no topo.

## 9. Publicar na internet (Você + Assistente)

1. **Você:** crie a conta em **vercel.com/signup** (pode entrar com a conta do GitHub).
2. **Assistente:** conecta ao Vercel e mostra um link com um código. **Você:** abra o link, entre na
   conta e clique em **Confirm**/**Allow**. Se não funcionar, ele vai pedir para você digitar
   `! npx vercel login` (Claude Code) ou rodar `npx vercel login` no Terminal.
3. **Assistente:** cria o projeto no Vercel, envia as configurações e publica. Leva de 1 a 3 minutos.
4. **Assistente:** mostra o endereço do sistema, algo como `https://contratacao-suaempresa.vercel.app`.
5. **Você:** abra o endereço e entre com o seu e-mail e senha.

> **Use sempre o endereço curto** que o assistente informar. O Vercel também cria endereços longos, com
> letras aleatórias, que pedem login do Vercel: candidatos não conseguem abri-los.

Esse endereço é o que vai nos links das vagas enviados aos candidatos. Se quiser usar um domínio próprio
(como `vagas.suaempresa.com.br`), configure depois em **vercel.com → seu projeto → Settings → Domains**
e peça ao assistente para atualizar o endereço no Supabase.

## 10. Primeiros passos no sistema

1. **Configurações:** preencha dados, missão, valores e cultura da empresa e envie documentos (manual,
   descrição de cargos). A IA usa isso para escrever vagas e avaliar candidatos.
2. **Nova vaga:** siga o passo a passo — informações básicas, contexto, competências, requisitos e
   perguntas, assessment, case e revisão do formulário.
3. Na página da vaga, aprove e **publique o formulário**. Clique em **Visualizar como candidato** e copie
   o endereço que abrir no navegador: esse é o link que você divulga para os candidatos.
4. Acompanhe os candidatos pelo **Painel** e pela página de cada vaga.

> Trabalhe sempre pelo **endereço publicado** (o `.vercel.app`), não pelo `localhost`. Os links que o
> sistema gera usam o endereço em que você está, e o `localhost` só funciona no seu computador.

## 11. Uso no dia a dia

Abra o assistente na pasta do sistema e peça em português:

| Você diz | O que acontece |
| --- | --- |
| "Adicione a Maria (maria@empresa.com) ao sistema" | Cria o acesso e mostra a senha para você repassar |
| "Adicione o Pedro como administrador" | Cria o acesso com perfil de dono |
| "Quem tem acesso ao sistema?" | Lista a equipe e o último acesso de cada um |
| "Troque a senha da Maria" | Gera uma senha nova |
| "Tire o acesso do Pedro" | Remove o acesso (o histórico das vagas continua) |
| "Atualize o sistema" ou `/atualizar` | Baixa a versão nova, atualiza o banco e republica |
| "Publique de novo" ou `/publicar` | Republica no Vercel |
| "O sistema está com problema" | Roda uma checagem completa e corrige |

## 12. Segurança

- O arquivo **`.env`**, na pasta do sistema, guarda as chaves da sua instalação. Não compartilhe, não
  envie por e-mail e não apague. Ele nunca vai para o GitHub. Vale guardar uma cópia num cofre de senhas.
- Cada pessoa da equipe deve ter o próprio acesso. Não compartilhe a senha de administrador.
- Ninguém consegue criar conta sozinho: só quem você cadastrar entra no sistema.
- Candidatos não têm conta: eles usam o link da vaga e um link individual de acompanhamento.

## 13. Problemas comuns

| Problema | Solução |
| --- | --- |
| `node -v` não funciona | Instale o Node.js (passo 2.1) e abra o Terminal de novo. |
| `claude` ou `codex` não é reconhecido | Feche e abra o Terminal. Se continuar, reinstale (passo 2.3). |
| O Git pede usuário e senha | Use o GitHub Desktop para baixar (passo 3). |
| "Limite de projetos gratuitos" no Supabase | O plano grátis permite 2 projetos ativos. Pause ou apague um antigo no painel do Supabase. |
| "E-mail ou senha incorretos" | Peça ao assistente: "troque a senha de fulano@empresa.com". |
| Tela "Acesso não liberado" | A pessoa não foi cadastrada: "adicione fulano@empresa.com ao sistema". |
| A IA não gera nada | Confira o crédito na OpenAI e peça: "verifique a chave da OpenAI". |
| O candidato vê uma tela de login do Vercel | O link usado é o endereço longo. Envie o endereço curto (`.vercel.app`) que o assistente informou. |
| Qualquer outra coisa | Peça ao assistente: "rode a verificação do sistema e me diga o que está errado". |

## Apêndice A — Login com Google (opcional)

Por padrão o login é por e-mail e senha. Para habilitar também o botão "Continuar com o Google":

1. No **Google Cloud Console** (console.cloud.google.com): **APIs e serviços → Credenciais → Criar
   credenciais → ID do cliente OAuth → Aplicativo da Web**. Em *URIs de redirecionamento autorizados*,
   coloque `https://<ref-do-projeto>.supabase.co/auth/v1/callback` (o assistente informa o `ref`).
2. No **Supabase**: **Authentication → Sign In / Providers → Google**, ative e cole o *Client ID* e o
   *Client Secret*.
3. Peça ao assistente: "ative o login com Google" — ele coloca `VITE_GOOGLE_LOGIN=true` no `.env` e
   republica.

Só entra com Google quem já foi cadastrado com o mesmo e-mail.

## Apêndice B — Instalação manual (sem assistente)

Para quem prefere fazer à mão, no Terminal, dentro da pasta do sistema:

```
npm install
npx supabase login                      # abre o navegador
npx supabase projects create "contratacao" --org-id <ORG> --db-password <SENHA> --region sa-east-1
npm run supabase:conectar -- --ref <REF> --token <TOKEN sbp_...>
# edite o .env e preencha OPENAI_API_KEY
npm run empresa -- --nome "Nome da empresa"
npm run usuario:adicionar -- --email voce@empresa.com --nome "Seu nome" --dono
npm run verificar
npm run dev                             # teste em http://localhost:8080
npx vercel login
npm run publicar
npm run supabase:endereco -- --url <ENDEREÇO .vercel.app> --token <TOKEN sbp_...>
```
