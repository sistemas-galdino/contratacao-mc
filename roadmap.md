# Roadmap

## Jornada pública progressiva do candidato
- [x] Separar dados públicos dos dados internos, com visibilidade opt-in para remuneração e condições
- [x] Apresentar a oportunidade antes do formulário; formulário em etapas, revisão e campos condicionais de emprego atual
- [x] Entregar acompanhamento privado por link individual, liberado conforme movimentação do RH
- [x] Restringir o case e as ações do candidato à etapa liberada; preservar prévias internas
- [x] Conferir candidatura, acompanhamento e case em desktop e celular

## Etapa 4 do wizard — Requisitos e perguntas (concluída)
- [x] Motor de sugestões a partir de vaga/contexto/competências/habilidades
- [x] Requisitos com detalhamento (experiência, formação, certificação, ferramentas)
- [x] Perguntas sugeridas em cards (tipo, origem, status, eliminatória)
- [x] Aprovar todas + adicionar pergunta manual (aberta/seleção única/múltipla)
- [x] Persistir estrutura no banco (tipo, opções, origem, status, competência/requisito ligado)
- [x] Formulário público usar apenas perguntas aprovadas

## IA da OpenAI no fluxo (concluída)
- [x] Motor de IA (Responses API, openai/gpt-6-astra) em src/lib/ai-gateway.server.ts
- [x] Server functions protegidas em src/lib/ai.functions.ts
- [x] Contexto da vaga escrito com IA (etapa 2 do cadastro)
- [x] Requisitos e perguntas gerados com IA, com sugestões automáticas como reserva
- [x] Triagem do candidato com IA → salva em Avaliações + histórico
- [x] Roteiro de entrevista gerado com IA → salvo no roteiro da vaga/candidato
- [x] Informações básicas: carga horária e horário em seleção, benefícios em tags (com "Outro")
- [x] Case técnico: "O que avaliar", "Formato de entrega" e "Critérios" em múltipla escolha com tags + "Outro"; avaliação sugere habilidades/competências da vaga
- [x] Contexto da vaga: textos de apoio sob cada título + campo renomeado "Contexto adicional da vaga"

## Formulário inteligente + Assessment (concluída)
- [x] Blocos "Queremos te conhecer melhor" (dados básicos) e "Queremos conhecer sua experiência"
- [x] Editor de perguntas: editar, duplicar, mover, excluir, obrigatória, eliminatória com resposta
- [x] Eliminatória só em critérios objetivos (nunca em dados básicos ou competências)
- [x] Etapa "Assessment" gerada com IA (reserva automática) e já aprovada, sem eliminar candidatos
- [x] Etapa "Revisar formulário" com prévia real, contagens e aprovação obrigatória antes de publicar
- [x] Banco: seção e campo das perguntas, versão/aprovação do formulário, respostas do assessment
- [x] Formulário público em 3 etapas com barra de progresso e final "Obrigado por participar! 💚"
- [x] Perfil do candidato mostra as respostas do assessment e a IA usa essas respostas na triagem e no roteiro

## Case técnico — módulo completo (concluído)
- [x] Banco: job_cases ampliado (modalidade, ferramentas, entregáveis, prazo, apresentação/agendamento, seções, status, versão, aprovação, link público) + case_assignments, case_deliveries, case_evaluations com RLS por empresa
- [x] Geração do case com IA (aiGenerateTechnicalCase) com versão de reserva automática
- [x] Configurar → gerar → revisar/editar/reordenar → aprovar → link público (copiar / visualizar como candidato); editar case aprovado gera nova versão e exige nova aprovação
- [x] Página pública /case/:token com desafio, missão, entregáveis, prazo, apresentação, agendar/entrar no Meet, enviar case ou confirmar preparo
- [x] Avaliação do case no perfil do candidato (critérios 1–5, pontos fortes, atenção, observações, perguntas realizadas, próximo passo)

## Análise e compatibilidade
- [x] Remover perguntas duplicadas por significado
- [x] Compatibilidade específica por vaga com composição, eliminatórios, confiança mínima de 70%, evidência x autodeclaração e visão executiva

- [x] Análises separadas por etapa e visão consolidada do candidato
