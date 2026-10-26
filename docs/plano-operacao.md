# Plano de operação e memória de decisões

Data: 24/10/2026. Prioridade definida pelo responsável pelo projeto.

## 1. Ordem obrigatória de trabalho

1. Auditar a implementação existente e registrar inconsistências.
2. Corrigir os erros da API atual, preservando as regras de negócio já confirmadas.
3. Após o responsável concluir a revisão da fase 1, padronizar os nomes das variáveis
   nos módulos e endpoints existentes, conforme a tarefa P01 abaixo.
4. Analisar a possibilidade de abstrair o bloco de código dentro do catch nos services para uma função
  'reThrowWriteError' em todos os services, conforme a versão antiga da P02. Essa abordagem apenas
  abstrai todo o código do catch para uma função e não padroniza necessariamente todas as mensagens de erros, como
  fazia a função deletada 'reThrowPersistenceError'.
4. Implementar e executar testes automatizados para todas as rotas existentes.
5. Somente depois implementar os novos requisitos do MVP.

Não iniciar consumo mensal, dashboards, novos filtros ou endpoints do cliente enquanto
as correções e a suíte da API existente não estiverem concluídas.
Reproduções pontuais durante a auditoria/correção são verificações de diagnóstico;
a suíte completa e permanente pertence à fase 2 abaixo.

Estado atual: F01–F21 implementados e commitados, encerrando os lotes 1.1–1.5.
F01/F16 foram commitados pelo responsável; as outras 19 correções têm commits individuais.
Verificações e limitações estão em [progresso-fase1.md](progresso-fase1.md).
Aguardar revisão e aceite do responsável. Não iniciar testes permanentes da fase 2 ou
requisitos da fase 3 sem nova autorização após essa avaliação.

## 2. Memória das decisões de produto

Fonte de requisitos: [requisitos-mvp.md](requisitos-mvp.md). Documento preservado para a fase 3.
Fonte de problemas atuais: [auditoria-tecnica.md](auditoria-tecnica.md).

- O administrador é `User` com perfil `ADMIN`; não criar entidade ou tabela `Operadora`.
- Uma única operação gerencia suas usinas e empresas clientes.
- O MVP será de métricas energéticas, com lançamentos mensais manuais e energia em MWh.
- A geração é registrada por usina e consolidada por distribuidora.
- Alocação e consumo são consolidados por empresa, sem separar matriz, filiais ou UCs.
- Quantidade alocada é informada manualmente. Percentual explícito é opcional; omissão ou
  `null` usa o percentual padrão da empresa. A quantidade deve corresponder a esse percentual.
- A base do percentual é a geração total mensal da distribuidora, e não o saldo disponível.
- Comparar percentuais com duas casas decimais, sem arredondar a energia para forçar igualdade.
- Cliente poderá consultar somente sua empresa quando o acesso específico for implementado.
- Fora do MVP: contratos, adesões, descontos, cobranças, valores financeiros, créditos
  utilizados e saldo acumulado do cliente. Operação diária é evolução posterior.
- Preservar a matriz atual de ADMIN/ANALYST/CLIENT durante as correções; não liberar rotas
  ao CLIENT como atalho para implementar o produto futuro.
- Orientação de 25/10/2026: preservar comentários existentes, removendo-os somente se o bloco
  correspondente também for removido. Em refatorações, acompanhar o bloco com seu comentário.
  Comentar de forma breve, em inglês, as principais regras e alterações da fase 1 e de toda implementação
  futura; resumir a finalidade do bloco sem explicações longas.
  Comentários novos e mensagens de commit devem ser escritos em inglês; preservar os comentários originais.
- Em 25/10/2026, o responsável priorizou como implementação futura o fluxo dedicado de
  transferência de usina com histórico entre distribuidoras (EF01, seção 11 dos requisitos).
  Definir vigência e tratamento dos históricos, alocações e saldos antes de implementar.
  O bloqueio F02 permanece até esse fluxo existir; a sequência das fases continua igual.

Esta é memória persistida no repositório. Novas sessões devem ler este plano e os documentos
referenciados antes de retomar tarefas; não depender somente do histórico do chat.

### Regra permanente para dúvidas delegadas a subagentes

Definida pelo responsável em 25/10/2026. Sempre que ele solicitar a delegação de uma dúvida:

- Fornecer ao subagente o contexto necessário dos requisitos e das decisões já tomadas.
- Restringir a tarefa à análise, sem alterar arquivos.
- Manter a investigação detalhada no contexto do subagente.
- Trazer ao chat principal somente a conclusão, a justificativa resumida e eventuais impactos
  nos requisitos, no plano de operação ou no desenvolvimento.

Aplicar a regra a cada solicitação desse tipo; ela não autoriza delegações por iniciativa própria.

## 3. Fase 0 — Auditoria da base existente

Concluída nesta entrega:

- Leitura dos 51 arquivos próprios de `src/`, dos 7 módulos e das 31 rotas.
- Revisão de schema, 14 migrações, seed, configurações e metadados das dependências.
- Inventário de acesso de cada rota e 21 achados priorizados, com evidências e limites.
- Reproduções em memória e HTTP local com repositórios simulados.
- Linha de base: tipos, lint, build e schema passaram; formatação tem 55 diagnósticos.

Não concluído nem presumido: testes reais de concorrência, replay/upgrade do banco,
verificação dos dados existentes e execução Linux. Essas verificações entram nos lotes
correspondentes e na fase 2, sem usar o banco atual como ambiente de teste destrutivo.

## 4. Fase 1 — Corrigir os erros atuais

Trabalhar em lotes pequenos, mantendo os IDs da auditoria e registrando o que foi corrigido,
a verificação realizada e o que ainda depende de banco real. Esta fase não é uma reescrita.

### Execução sequencial e commits — autorização exclusiva da fase 1

Executar lote por lote, na ordem da tabela abaixo, e dentro de cada lote executar um achado
por vez, na ordem em que os IDs aparecem. Não iniciar o próximo achado ou lote antes de
implementar, verificar e commitar o achado atual.

Para cada achado:

1. Implementar somente a correção correspondente e executar as verificações pertinentes.
2. Registrar as alterações e as verificações no acompanhamento da fase.
3. Fazer um commit focado, com mensagem em inglês, contendo a correção daquele achado.
4. Registrar o status **concluído e commitado** e prosseguir sem pedir revisão intermediária.
5. Após todos os achados do lote, seguir para o lote seguinte.
6. Ao finalizar a fase 1, apresentar commits, verificações e limitações e solicitar a revisão
   e avaliação do responsável. Não iniciar a fase 2, a fase 3 ou qualquer requisito novo.

Esta autorização substitui a pausa por achado apenas durante a fase 1. Não concede aprovação
antecipada para fases posteriores. Verificações pontuais das correções não constituem a
implementação da suíte permanente, que continua reservada à fase 2.

Não agrupar achados em um único commit por conveniência. Registrar dependências e resolver
as escolhas de implementação conservando o comportamento confirmado. Decisões que mudem
o produto exigem esclarecimento; não constituem mera revisão de código. Alterações não relacionadas não entram
automaticamente no commit do achado.

| Lote | Achados | Resultado esperado |
| --- | --- | --- |
| 1.1 — Acesso | F01, F16 | Validar Bearer e claims; usuário existente/ativo e perfil atual em cada requisição. |
| 1.2 — Saldos | F02, F03, F04, F13 | Impedir trocas de distribuidora com histórico, fechar janelas concorrentes e manter Decimal nos ajustes. |
| 1.3 — Alocações | F05, F06, F07, F08, F09 | Unificar validação no POST/PATCH, corrigir padrão, arredondamento, geração zero e limites do cadastro. |
| 1.4 — Contratos da API | F10, F11, F12, F14, F15, F17 | Validar vínculos e referências, devolver registros e status corretos, normalizar erros e ordenar páginas. |
| 1.5 — Reprodutibilidade | F18, F19, F20, F21 | Uniformizar caminhos, alinhar migrações/defaults, tornar seed seguro/repetível e normalizar formatação. |

Regras para os lotes:

- Preservar quantidade manual e alocação por distribuidora/empresa/competência.
- Em criação de alocação, omissão/null usa padrão da empresa. No PATCH, omissão preserva
  o percentual da alocação; `null` solicita o padrão atual da empresa, como no código atual.
  Validar o conjunto efetivo após aplicar as alterações, inclusive empresa e competência.
- Manter o padrão cadastral inteiro entre 0 e 100, coerente com `Int`; percentuais explícitos
  de alocação continuam decimais. Não adicionar migração para padrão fracionário sem necessidade.
- Toda operação que altera disponibilidade ou seus vínculos precisa participar da mesma
  estratégia de concorrência; apenas colocar parte das gravações em transação não basta.
- Nunca fazer reparo automático de dados sem antes identificar divergências. Verificar
  totais gerados/alocados e comparar ao saldo por distribuidora e competência.
- Preservar migrações já aplicadas; correções de schema entram em migrações novas e revisáveis.
- Resolver D01 antes de alterar a regra sobre mudança de geração após alocações. Não recalcular
  percentuais históricos silenciosamente. R01/R02 exigem conhecer o histórico de aplicação e dados.
- Manter formatação em alteração separada das correções lógicas para facilitar revisão.

Aceite da fase: todos os F01–F21 resolvidos ou, para dependência externa específica, explicitamente
avaliados com o responsável; verificações apropriadas concluídas e sem divergências de saldo
nos cenários exercitados. Não considerar risco pendente como corrigido apenas por leitura de código.

### P01 — Padronização de variáveis após a revisão da fase 1

Status: **a fazer**, solicitado pelo responsável em 25/10/2026. Executar logo após ele
concluir a revisão da fase 1 e tratar os ajustes decorrentes, antes de iniciar a fase 2.
Não executar durante a revisão em andamento.

- Revisar todos os módulos e endpoints existentes para uniformizar os nomes das variáveis
  locais equivalentes, incluindo os trechos que não receberam essa padronização na fase 1.
- Preferir nomes curtos e claros no contexto, como `generation` para o registro consultado
  e `deleted` para o resultado de uma exclusão, em lugar de nomes como
  `monthlyGenerationFound` e `monthlyGenerationDeleted`.
- Aplicar o mesmo critério às demais entidades e operações; manter nomes específicos quando
  necessários para distinguir registros, origens e destinos no mesmo escopo.
- Limitar a alteração à nomenclatura interna, preservando comportamento, contratos da API,
  campos persistidos e comentários existentes, conforme a regra de preservação de comentários.
- Conferir o diff e executar as verificações de tipos, lint, formatação e build.

Aceite: nomenclatura consistente entre operações equivalentes em todos os módulos,
sem mudanças funcionais. Esta tarefa não inicia a suíte permanente nem os requisitos do MVP;
a autorização de commits automáticos exclusiva da fase 1 não se estende a ela.

### P02 — Proposta substituída pela revisão da F14

Status: **substituída**, por decisão do responsável em 25/10/2026. A proposta anterior
de centralizar tratamentos e extrair novos métodos `rethrowWriteError` não será executada.
O responsável solicitou a reimplementação da F14 durante a revisão, incorporada ao commit
correspondente: remover `rethrowPersistenceError` e tratar os erros pertinentes diretamente
nos `catch` dos serviços, com mensagens específicas de cada operação.

Preservar os status 409 para unicidade/dependências/conflitos transacionais e 404 para
registros/referências inexistentes, conforme a operação. Erros de negócio e desconhecidos
continuam sendo propagados. Manter `isTransactionConflict`, que apenas identifica os dois
formatos de conflito. O método privado já existente em geração antecede a F14 e não foi
alterado nesta revisão. Não reintroduzir o tradutor compartilhado como refatoração futura.

Verificações desta revisão constam em [progresso-fase1.md](progresso-fase1.md).
Os mapeamentos pertinentes devem integrar a suíte permanente da fase 2. P01 continua pendente;
esta revisão não autoriza iniciar fases posteriores.

## 5. Fase 2 — Testes automatizados de todas as rotas existentes

### Ferramentas e isolamento

- Usar `node:test`, `node:assert/strict` e `tsx`, aproveitando o runtime e a dependência existentes.
- Testes HTTP usam a aplicação Express em porta local efêmera e `fetch`, com encerramento
  garantido do servidor e das conexões. Não importar `server.ts` para não fixar a porta 3000.
- Criar comandos `test` para a suíte e `test:integration` para os casos com PostgreSQL.
  A organização fica em `test/unit/` e `test/integration/`; `test/e2e/` vazio pode ser usado
  para fluxos completos sem confundir fixtures com código de produção.
- Testes de integração usam `TEST_DATABASE_URL` separado. Recusar ausência de configuração
  ou destino igual ao banco da aplicação; confirmar destino isolado antes de limpeza/migrações.
- Aplicar as migrações em banco de testes vazio, criar fixtures explícitas por execução
  e limpar somente os dados/ambiente de testes. Não executar seed administrativo do usuário.
- Não substituir PostgreSQL por SQLite nem considerar mocks prova de transação/concorrência.
- Fazer testes em sequência quando compartilharem banco/limitadores; isolar cenários de 429
  por processo ou janela para evitar falsos resultados por contadores compartilhados.

### Cobertura mínima por rota

Usar a matriz de 31 rotas da auditoria como checklist. Cada método/caminho precisa ter
cenário de sucesso e de falha pertinentes; execução de uma única rota não cobre o módulo.

| Grupo | Cenários obrigatórios |
| --- | --- |
| Login e registro | Credenciais corretas/incorretas, situação inativa, e-mail repetido, empresa inválida e perfil proibido. |
| Todas as protegidas | Token ausente/inválido/expirado, esquema incorreto, usuário removido/inativo e perfis permitidos/proibidos. |
| GET de listas | Lista vazia/preenchida, paginação, limites inválidos e ordenação estável. |
| GET por ID | Registro existente, UUID inválido e UUID válido inexistente. |
| POST/PATCH cadastrais | Dados válidos, campos inválidos, unicidade, referências e bloqueios de vínculo com histórico. |
| DELETE cadastrais | Exclusão permitida, registro inexistente e dependência impeditiva com erro de domínio. |
| Geração | Criar, alterar quantidade, trocar mês/ano/usina, excluir e conferir os saldos de origem/destino. |
| Alocação | Número explícito, omitido/null, incompatibilidade, arredondamento, zero, duplicidade e falta de saldo. |
| PATCH/DELETE alocação | Trocas de destino/competência, devolução de energia e validação do conjunto efetivo. |
| Transações reais | Rollback sem gravação parcial; alocações concorrentes; geração versus alocação; duas correções da mesma geração. |
| HTTP transversal | JSON malformado, corpo excessivo, status/corpos de resposta e rate limiting com 429. |
| Inicialização | Checkout novo, geração explícita do cliente Prisma, aplicação das migrações e build em Linux. |

Em todas as operações energéticas relevantes, verificar:

1. Soma das gerações = total gerado do saldo da distribuidora na competência.
2. Soma das alocações = total alocado do mesmo saldo.
3. Disponibilidade = total gerado − total alocado, sem valor negativo.
4. Falhas não deixam alterações parciais e movimentos ajustam origem e destino.

A cobertura pretendida é funcional sobre 31/31 rotas e os invariantes de negócio.
Não confundir isso com promessa de 100% de linhas cobertas. Registrar o resultado por rota
e configurar CI para executar verificações e testes em PostgreSQL isolado antes da fase 3.

Aceite: suíte repetível do zero, todas as rotas marcadas na matriz, testes de integração
e concorrência passando, build Linux validado e nenhuma falha de integridade conhecida aberta.

## 6. Fase 3 — Retomar os requisitos do MVP

Somente após o aceite das fases 1 e 2, seguir o documento de requisitos preservado:

1. Registro mensal de consumo consolidado por empresa.
2. Consultas históricas e filtros por período para as métricas.
3. Endpoints do cliente com isolamento por empresa e agregações administrativas.
4. Dashboards administrativo e do cliente, com distinção entre zero e dado não informado.

Cada funcionalidade nova passa a incluir seus testes desde a implementação, aproveitando
a infraestrutura da fase 2. Não reintroduzir contratos, cobranças ou métricas financeiras.

Na retomada do planejamento de funcionalidades, detalhar também a evolução prioritária
EF01: transferência de usina com histórico entre distribuidoras, descrita na seção 11 de
[requisitos-mvp.md](requisitos-mvp.md). Sua posição na entrega será definida nesse planejamento,
após a fase 2. A necessidade do fluxo foi confirmada; as regras temporais e retroativas
ainda precisam de definição. Não liberar a troca por simples remoção do bloqueio F02.

## 7. Próxima ação ao retomar

Solicitar e aguardar revisão do código da fase 1, com base nos commits e nas evidências em
[progresso-fase1.md](progresso-fase1.md). As implementações F01–F21 estão concluídas;
as fases 2 e 3 não foram iniciadas. Tratar eventuais ajustes dessa revisão antes de avançar.
Após a conclusão da revisão pelo responsável, executar P01 (padronização de variáveis)
antes de iniciar a fase 2, que continua dependendo de autorização para prosseguir.
P02 foi substituída pela revisão da F14; não executar sua proposta anterior de centralização.
Build Linux permanece pendente por indisponibilidade do runtime adequado no ambiente atual.
O banco existente não foi auditado nem migrado. R01/R02 e decisões D01–D03 continuam explícitos
na auditoria; nenhuma correção de dados ou nova regra de produto foi aplicada por suposição.
