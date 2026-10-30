# Case técnico como módulo completo do processo

O assessment já foi corrigido neste turno: ao gerar, todas as questões chegam com situação, pergunta, tipo, competência, alternativas, pesos internos de avaliação e "o que observar" preenchidos. Antes de mostrar e antes de salvar, o sistema valida e completa automaticamente qualquer questão incompleta. O status só fica "Pronto para uso" quando não há campo obrigatório vazio. O gestor apenas visualiza, edita, exclui, adiciona ou gera novamente.

O que segue é o plano para o Case técnico, que é bem maior e envolve novas telas e novo armazenamento.

## Fluxo que vamos entregar

```text
CONFIGURAR → GERAR COM IA → REVISAR/EDITAR → APROVAR → LINK PÚBLICO
→ CANDIDATO ACESSA → ENTREGA OU CONFIRMA PREPARO → APRESENTAÇÃO → AVALIAÇÃO
```

## 1. Configuração do case (na criação da vaga e na aba Case)

- "Esta vaga terá case técnico?" Sim/Não (mantido).
- O que queremos validar: múltipla escolha com tags, já sugerindo as competências e habilidades da vaga.
- Modalidade obrigatória: material pronto fornecido pela empresa ou candidato cria a entrega.
  - Se o candidato cria: ferramentas/formatos em múltipla escolha (PowerPoint, Google Slides, Canva, Excel, Sheets, Word, Docs, PDF, Notion, Lovable, ferramenta de IA, livre escolha, Outro) e a definição "ferramenta obrigatória" ou "candidato escolhe".
- Entregáveis: múltipla escolha (apresentação, documento, planilha, dashboard, análise, plano de ação, estratégia, diagnóstico, protótipo, processo, vídeo, Outro) + campo aberto "descreva exatamente o que deverá ser entregue".
- Prazo de preparação: 24h, 48h, 3, 5, 7 dias ou personalizado.
- Apresentação: Sim/Não; formato (Google Meet, presencial, outra plataforma online, a definir); duração (10 a 60 min ou personalizado), com tempo de apresentação, tempo de perguntas e total.
- Agendamento: link da agenda, link do Meet, agendar depois ou responsável agenda manualmente. Link nunca obrigatório na criação.
- Critérios de avaliação: múltipla escolha com tags (mantido).

## 2. Gerar case com IA

Botão "Gerar case com IA" usando automaticamente contexto da empresa, contexto da vaga, objetivo, responsabilidades, rotina, resultados esperados, desafios, competências, habilidades, requisitos, o que avaliar, modalidade, entregáveis, ferramentas, prazo, forma e tempo de apresentação e critérios.

A IA devolve o case em seções: nome, contexto, cenário/desafio, briefing, missão, o que desenvolver/analisar, entregáveis, regras, materiais, prazo, instruções de apresentação, critérios e perguntas sugeridas para o avaliador. Se a IA falhar, um case automático é montado com os mesmos dados.

## 3. Revisar e aprovar

Tela "Revisar case" mostrando o documento como o candidato verá. Em cada seção: editar, adicionar informação, excluir e reordenar; além de "adicionar seção" e "gerar novamente com IA". Nada é publicado antes do botão "Aprovar case", que registra responsável, data e versão. Editar um case aprovado cria nova versão e pede nova aprovação; o candidato continua vendo a versão aprovada anterior até a nova ser aprovada.

## 4. Link do case e experiência do candidato

Após aprovar: "Copiar link", "Visualizar como candidato" e "Editar". A página pública (responsiva, identidade PMC) mostra vaga, empresa, prazo, tempo restante, desafio, missão, entregáveis, como preparar, critérios, prazo e apresentação, com botão "Agendar apresentação" ou "Entrar no Google Meet" quando houver link.

- Modalidade "candidato cria": bloco "Enviar meu case" com upload de arquivo ou link, registrando data/hora e status "Case recebido".
- Modalidade "material pronto": bloco "Material do case" com os arquivos/links disponibilizados e botão "Confirmar que estou pronto para apresentar", sem exigir upload.

## 5. Avaliação no perfil do candidato

Painel "Avaliar case" com os critérios definidos em notas de 1 a 5, pontos fortes, pontos de atenção, observações do avaliador, perguntas realizadas e próximo passo. Tudo fica registrado no histórico do candidato e alimenta a análise com IA.

## 6. Status do case

Não gerado, rascunho, aguardando aprovação, aprovado, enviado ao candidato, em preparação, entregue, apresentação agendada, apresentado, avaliado — visíveis no funil e no perfil do candidato.

## Detalhes técnicos

- Banco: ampliar `job_cases` (modalidade, ferramentas, obrigatoriedade de ferramenta, entregáveis, descrição da entrega, prazo, dados de apresentação e agendamento, seções do case em jsonb, status, versão, aprovação e `public_token`); novas tabelas `case_assignments` (candidato, prazo final, status, datas) e `case_deliveries` (arquivo/link, tipo, data), além de `case_evaluations` (notas por critério, textos, avaliador). RLS por empresa em todas, com política `anon` restrita à leitura por token do case publicado, no mesmo padrão já usado na vaga pública.
- Upload de entrega e materiais em bucket de storage do backend, com URL assinada.
- Nova server function `aiGenerateTechnicalCase` (mesmo padrão protegido, com fallback determinístico).
- Novas telas: seção de case ampliada no wizard e na aba Case da vaga, `revisar case`, rota pública `/case/$token`, painel de avaliação no perfil do candidato.
