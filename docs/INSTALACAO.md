# Guia de instalação do Vetor

Este guia instala o sistema de contratação com a ajuda do **Claude**. Você não precisa saber programar:
vai copiar alguns textos prontos (os *prompts*), colar no Claude e acompanhar. Ele instala as ferramentas,
baixa o sistema, cria o banco de dados, cadastra sua empresa e publica tudo na internet.

**O que fica com você:** criar as contas, clicar em "Autorizar" no navegador algumas vezes e copiar
duas chaves. **Tempo estimado:** de 30 a 40 minutos.

> **Como ler este guia:** os blocos **Copie e cole no Claude** são os prompts — copie o bloco inteiro e
> cole na conversa com o Claude. Os selos **Você** e **Claude** mostram quem faz cada etapa.

## 1. Crie as contas (Você)

É a única parte que o Claude não consegue fazer por você. Crie antes de começar:

| Conta | Para quê | Custo | Onde criar |
| --- | --- | --- | --- |
| Claude (Pro ou Max) | É quem faz a instalação | Assinatura | [claude.ai](https://claude.ai) |
| GitHub | Baixar o sistema | Grátis | [github.com](https://github.com/signup) |
| Supabase | Banco de dados, login e arquivos | Grátis (até 2 projetos) | [supabase.com](https://supabase.com/dashboard/sign-up) |
| Vercel | Deixar o sistema na internet | Grátis para testar; Pro (US$ 20/mês) para uso na empresa | [vercel.com](https://vercel.com/signup) |
| OpenAI (opcional) | Recursos de IA do sistema | Pago por uso | [platform.openai.com](https://platform.openai.com/signup) |

> **Dica:** no Supabase e no Vercel, clique em **Continue with GitHub** para criar a conta. É mais
> rápido e você fica com uma senha a menos.

> **Acesso ao sistema:** o repositório é privado. Envie o seu usuário do GitHub para quem te passou o
> sistema e aceite o convite que chega por e-mail (ou em
> [github.com/sistemas-galdino/contratacao-mc/invitations](https://github.com/sistemas-galdino/contratacao-mc/invitations)).

> **Sobre o Vercel:** o plano grátis (Hobby) é só para uso pessoal e não comercial. Use-o para testar;
> quando a empresa começar a usar o sistema com candidatos de verdade, assine o
> [plano **Pro**](https://vercel.com/pricing).

## 2. Abra o Claude Code (Você)

O Claude Code é o Claude que consegue mexer no seu computador. Ele fica dentro do aplicativo do Claude,
que é a única coisa que você instala à mão:

1. Baixe o aplicativo em [claude.ai/download](https://claude.ai/download), instale e entre com a sua
   conta.
2. Clique em **Code** para abrir o Claude Code.
3. Quando ele pedir uma pasta para trabalhar, escolha **Documentos**.

> Sempre que o Claude pedir permissão para rodar um comando, ele explica antes o que vai fazer. Leia e
> aprove. Se ele oferecer a opção de não perguntar de novo para aquele tipo de comando, pode aceitar.

> **Usa o Codex (ChatGPT)?** Os mesmos prompts funcionam nele. Onde o guia fala em Claude, leia Codex.

## 3. Prompt 1 — Preparar o computador (Claude)

```prompt
Quero instalar o sistema de contratação Vetor neste computador. Faça tudo por mim, explicando cada passo numa frase simples. Só me peça algo quando for indispensável, como autorizar um login no navegador.

1. Veja o que já está instalado e instale o que faltar: Node.js (versão 22 ou mais nova), Git e GitHub CLI (gh). Prefira formas que não peçam a senha do computador (no Mac sem Homebrew: fnm para o Node e o arquivo oficial do gh). Se alguma etapa for pedir senha ou abrir uma janela, me avise antes e diga o que vai aparecer.
2. Conecte o GitHub CLI à minha conta: rode gh auth login --web em segundo plano e me mostre o código e o link para eu autorizar no navegador. Depois deixe o Git usando esse mesmo login (gh auth setup-git).
3. Baixe o repositório sistemas-galdino/contratacao-mc para uma pasta chamada contratacao-mc, dentro desta pasta, e rode npm install nela.
4. No fim, me diga se deu tudo certo.
```

**O que você faz:**

- Quando o Claude mostrar um código do GitHub, abra
  [github.com/login/device](https://github.com/login/device), cole o código e clique em **Authorize**.
- No Mac, pode aparecer uma janela pedindo para instalar as "ferramentas de linha de comando": clique em
  **Instalar** e espere terminar (alguns minutos). Depois, diga ao Claude: "terminou, pode continuar".
- Se o Claude disser que não encontrou o repositório, aceite o convite em
  [github.com/sistemas-galdino/contratacao-mc/invitations](https://github.com/sistemas-galdino/contratacao-mc/invitations)
  e peça para ele tentar de novo.

> As ferramentas do Supabase e do Vercel não precisam de instalação separada: elas vêm junto com o
> sistema, no `npm install`.

## 4. Prompt 2 — Configurar e publicar o sistema (Claude)

Troque o que está entre colchetes pelos seus dados antes de enviar:

```prompt
Agora entre na pasta contratacao-mc, leia o arquivo docs/agente/configurar.md e siga o roteiro do começo ao fim para configurar o sistema para mim.

Já respondo as perguntas do roteiro:
- Nome da empresa: [Nome da empresa]
- Administrador: [Seu nome completo], [seu@email.com]
- Supabase: crie um projeto novo para o sistema
- Chave da OpenAI: [vou mandar quando você pedir / não tenho agora]
- Publicar na internet: sim, no Vercel
```

Durante a configuração, o Claude vai te pedir três coisas, uma de cada vez:

**1. Token do Supabase**

1. Acesse [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
2. Clique em **Generate new token**, dê o nome `instalacao-contratacao` e confirme.
3. Copie o token (começa com `sbp_`) e cole na conversa com o Claude.

Com ele, o Claude cria o projeto na região de São Paulo, monta o banco, busca as chaves de acesso e fecha
o cadastro aberto: só quem você liberar entra no sistema.

**2. Chave da OpenAI (opcional)**

1. Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys) e clique em
   **Create new secret key**.
2. Copie a chave (começa com `sk-`) e cole na conversa.
3. Em [Settings → Billing](https://platform.openai.com/settings/organization/billing/overview),
   adicione crédito. O uso é cobrado por consumo.

Sem a chave o sistema funciona, mas sem os recursos de IA: geração da vaga, perguntas, assessment, case
e análise de entrevistas. Você pode mandar depois, pedindo: "adicione a minha chave da OpenAI".

**3. Autorização do Vercel**

O Claude mostra um link (ele é clicável na conversa). Abra, entre na sua conta do Vercel e confirme. Ele publica o sistema em seguida
(leva de 1 a 3 minutos).

**No fim, o Claude mostra o endereço do sistema, o seu e-mail e a sua senha.**

> **Anote a senha num lugar seguro**, como um gerenciador de senhas. Ela aparece uma vez só. Se perder,
> é só pedir ao Claude: "troque a minha senha".

> Se você já abriu o Claude **dentro** da pasta contratacao-mc, pode simplesmente digitar `/configurar`.

## 5. Teste o sistema (Você)

1. Abra o endereço que o Claude informou (termina em `.vercel.app`), de preferência numa janela anônima
   do navegador.
2. Entre com o seu e-mail e a senha e confira se o nome da sua empresa aparece no topo.
3. Em **Configurações**, preencha os dados, a missão, os valores e a cultura da empresa e envie
   documentos (manual, descrição de cargos). A IA usa isso para escrever as vagas e avaliar candidatos.
4. Crie a primeira vaga em **Nova vaga** e siga as etapas.
5. Na página da vaga, aprove e publique o formulário. Clique em **Visualizar como candidato** e copie o
   endereço que abrir: esse é o link que você divulga para os candidatos.

> Trabalhe sempre pelo endereço `.vercel.app`, nunca pelo `localhost`: os links que o sistema gera usam o
> endereço em que você está, e o `localhost` só funciona no seu computador.

## 6. Prompt 3 — Conector do Supabase (Você + Claude)

Opcional. Com o conector do Supabase, você pode fazer perguntas ao Claude sobre os dados do sistema. Ele
fica em modo **somente leitura**: o Claude consulta, mas não altera nada.

```prompt
Conecte o conector (MCP) do Supabase ao Claude Code neste projeto, em modo somente leitura e limitado ao projeto do sistema, seguindo o passo "Conector do Supabase" do arquivo docs/agente/configurar.md. Depois me diga como autorizar.
```

**O que você faz:** abra uma conversa nova no Claude Code escolhendo a pasta **contratacao-mc** e peça:
"autentique o conector do Supabase". O Claude mostra um link: abra, escolha a organização do projeto e
autorize.

Depois é só perguntar, por exemplo:

- "Quantos candidatos se inscreveram em cada vaga esta semana?"
- "Quais candidatos da vaga de Assistente Administrativo estão na etapa de entrevista?"
- "Qual vaga está há mais tempo aberta sem candidatos novos?"

## 7. Prompts do dia a dia

Ao abrir uma conversa nova no Claude Code, escolha a pasta **contratacao-mc** (dentro de Documentos) e
peça em português:

| Você pede | O que acontece |
| --- | --- |
| "Adicione a Maria (maria@empresa.com) ao sistema" | Cria o acesso e mostra a senha para você repassar |
| "Adicione o Pedro (pedro@empresa.com) como administrador" | Cria o acesso com perfil de dono |
| "Quem tem acesso ao sistema?" | Lista a equipe e o último acesso de cada um |
| "Troque a senha da Maria" | Gera uma senha nova |
| "Tire o acesso do Pedro" | Remove o acesso; o histórico das vagas continua |
| "Adicione a minha chave da OpenAI: sk-..." | Grava a chave e republica |
| "Publique de novo" ou `/publicar` | Republica no Vercel |
| "O sistema está com problema" | Faz uma checagem completa e corrige |

## 8. Atualizações

Quando houver uma versão nova do sistema, abra o Claude Code na pasta contratacao-mc e cole:

```prompt
Atualize o sistema para a versão mais nova do repositório, seguindo o arquivo docs/agente/atualizar.md, e me conte o que mudou.
```

No Claude Code, também dá para digitar `/atualizar`. Se o Claude pedir um token do Supabase novo, gere
como no passo 4.

## 9. Segurança

- O arquivo **`.env`**, na pasta contratacao-mc, guarda as chaves da sua instalação. Não compartilhe,
  não envie por e-mail e não apague. Ele nunca vai para o GitHub nem para o Vercel. Vale guardar uma
  cópia num cofre de senhas.
- O token do Supabase fica guardado só no seu computador, para o Claude aplicar as atualizações do
  banco. Se preferir, apague-o em
  [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens); numa próxima
  atualização, basta gerar outro.
- Cada pessoa da equipe deve ter o próprio acesso. Ninguém consegue criar conta sozinho: só entra quem
  você liberar.
- Candidatos não têm conta: eles usam o link da vaga e um link individual de acompanhamento.

## 10. Se algo der errado

Na maioria dos casos, basta pedir:

```prompt
Algo não está funcionando no sistema. Rode a verificação (npm run verificar), me explique o problema em linguagem simples e corrija o que der para corrigir.
```

Alguns pontos só você resolve:

| Situação | O que fazer |
| --- | --- |
| O Claude não encontra o repositório | Aceite o convite em [github.com/sistemas-galdino/contratacao-mc/invitations](https://github.com/sistemas-galdino/contratacao-mc/invitations) e peça para ele tentar de novo. |
| O computador pede uma senha durante a instalação | É a senha que você usa para entrar no computador. |
| O Supabase fala em limite de projetos gratuitos | O plano grátis permite 2 projetos ativos. Pause ou apague um projeto antigo no [painel do Supabase](https://supabase.com/dashboard/projects). |
| O candidato vê uma tela de login do Vercel | O link enviado é o endereço longo. Envie o endereço curto que termina em `.vercel.app`. |
| A IA não gera nada | Confira se há crédito em [Billing da OpenAI](https://platform.openai.com/settings/organization/billing/overview). |

## Apêndice — Login com Google (opcional)

Por padrão, o login é por e-mail e senha. Para ter também o botão "Continuar com o Google", cole:

```prompt
Quero ativar o login com Google no sistema. Siga a seção "Login com Google" do arquivo docs/agente/configurar.md: me guie no Google Cloud Console e faça você o resto.
```

O Claude te guia para criar uma credencial no [Google Cloud Console](https://console.cloud.google.com)
e te pede para colar dois códigos na
conversa. Ele ativa o Google no Supabase e publica de novo. Se pedir um token do Supabase novo, gere
como no passo 4. Só entra com o Google quem já foi cadastrado no sistema com o mesmo e-mail.
