---
description: Libera, lista, troca a senha ou remove o acesso de pessoas da equipe
argument-hint: "[adicionar|listar|senha|remover] e-mail e nome"
---

A pessoa quer gerenciar quem acessa o sistema: $ARGUMENTS

Use os comandos da tabela "O que a pessoa pode pedir" do `AGENTS.md` (`npm run usuario:adicionar`,
`usuario:listar`, `usuario:senha`, `usuario:remover`). Se faltar e-mail ou nome, pergunte. Antes de
remover alguém, confirme. Mostre a senha gerada só para a pessoa anotar e lembre o endereço do sistema
(`APP_URL` no `.env`, ou http://localhost:8080 se ainda não foi publicado).
