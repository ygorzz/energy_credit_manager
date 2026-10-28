# Plano de operação e memória de decisões

Data: 24/10/2026. Prioridade definida pelo responsável pelo projeto.

## 1. Ordem obrigatória de trabalho

1. Auditar a implementação existente e registrar inconsistências.
2. Corrigir os erros da API atual, preservando as regras de negócio já confirmadas.
3. Após o responsável concluir a revisão da fase 1, padronizar os nomes das variáveis
   nos módulos e endpoints existentes, conforme a tarefa P01 abaixo.
4. Extrair os tratamentos de escrita para métodos privados `rethrowWriteError` em cada
   serviço, preservando mensagens e status por operação, conforme P03 abaixo.
5. Implementar e executar testes automatizados para todas as rotas existentes.
6. Somente depois implementar os novos requisitos do MVP.

Não iniciar consumo mensal, dashboards, novos filtros ou endpoints do cliente enquanto
as correções e a suíte da API existente não estiverem concluídas.
Reproduções pontuais durante a auditoria/correção são verificações de diagnóstico;
a suíte completa e permanente pertence à fase 2 abaixo.

Estado atual: F01–F21 implementados e commitados, encerrando os lotes 1.1–1.5.
F01/F16 foram commitados pelo responsável; as outras 19 correções têm commits individuais.
Verificações e limitações estão em [progresso-fase1.md](progresso-fase1.md).
Em 27/10/2026, o responsável informou que concluiu a revisão da fase 1 e publicou as
alterações no GitHub. Após implementar P01 e analisar o item 4, autorizou também a extração
dos tratamentos de escrita para métodos privados de cada serviço (P03). Posteriormente,
autorizou o pré-requisito da fase 2 descrito na seção 5. Essa entrega está implementada e
aguarda sua revisão, sem commit e sem iniciar o lote 2.0. A fase 3 continua fora do escopo.

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
- Decisão confirmada para a fase 2: PATCH vazio deve retornar 400 nos seis módulos.
  A entrada precisa conter ao menos um campo reconhecido com valor diferente de `undefined`
  após o processamento pelo Zod. Valores `0` e `null` contam como informados quando
  permitidos pelo campo; campos desconhecidos isolados não constituem atualização.
- O PATCH de usinas deve preservar o status omitido. Somente a criação mantém o default
  `ACTIVE`; esta correção foi explicitamente autorizada junto da rejeição de PATCH vazio.

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

Status: **concluído em 27/10/2026**, após o responsável encerrar a revisão da fase 1 e
autorizar a execução. Solicitado originalmente em 25/10/2026.

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

Entrega: variáveis locais padronizadas em 14 arquivos dos sete módulos. Resultados de
criação, exclusão e alteração usam `created`, `deleted` e `updated`; consultas usam nomes
da entidade no contexto, como `generation`, `allocation`, `plant`, `company` e `user`.
Listas, parâmetros validados e variáveis auxiliares equivalentes seguem o mesmo critério.
Mantidos nomes distintos para origem/destino, energia anterior/nova e saldos históricos.
As 18 propriedades de resposta associadas aos resultados foram preservadas explicitamente;
a renomeação das variáveis não altera o contrato JSON. Comentários originais preservados.

Verificação: comparação dos tokens executáveis confirmou somente as renomeações previstas
e os aliases de resposta; os 49 blocos `catch` dos arquivos alterados permaneceram iguais.
Tipos, build, lint e Biome dos 14 arquivos passaram. Os comandos globais `format:check`
e `biome:check` apontam 29 diagnósticos de formatação em arquivos não alterados por P01.
Não foi criada suíte permanente nem acessado o banco para esta refatoração.

### P02 — Proposta substituída pela revisão da F14

Status: **substituída**, por decisão do responsável em 25/10/2026. A proposta anterior
de centralizar tratamentos e extrair novos métodos não foi executada naquela etapa.
O responsável solicitou a reimplementação da F14 durante a revisão, incorporada ao commit
correspondente: remover `rethrowPersistenceError` e tratar os erros pertinentes diretamente
nos `catch` dos serviços, com mensagens específicas de cada operação.

Preservar os status 409 para unicidade/dependências/conflitos transacionais e 404 para
registros/referências inexistentes, conforme a operação. Erros de negócio e desconhecidos
continuam sendo propagados. Manter `isTransactionConflict`, que apenas identifica os dois
formatos de conflito. O método privado já existente em geração antecede a F14 e não foi
alterado nesta revisão. Não reintroduzir o tradutor compartilhado como refatoração futura.

Verificações desta revisão constam em [progresso-fase1.md](progresso-fase1.md).
Os mapeamentos pertinentes devem integrar a suíte permanente da fase 2. P01 foi concluída
posteriormente; a nova extração autorizada em 27/10/2026 está registrada em P03 e mantém
os tratamentos dentro dos serviços, sem reintroduzir o tradutor compartilhado.

### P03 — Métodos privados para os erros de escrita de cada serviço

Status: **concluído em 27/10/2026**, após análise e autorização explícita do responsável.

- Adicionado `rethrowWriteError` privado nos serviços de distribuidoras, usinas, empresas,
  alocações, usuários e autenticação. Geração conserva seu método privado já existente.
- Nos serviços com tratamentos diferentes entre operações, o método recebe `operation`.
  Usuários aceita `update`/`delete`; os demais serviços cadastrais e alocações aceitam
  `create`/`update`/`delete`. Em autenticação, somente o registro utiliza esse tratamento,
  portanto seu método recebe apenas o erro.
- Mantidos os códigos tratados por operação, as mensagens exatas e os status HTTP.
  `P2003` em criação/alteração continua sendo distinguido das dependências de exclusão;
  erros antes não traduzidos em determinada operação continuam sendo propagados.
- Erros de negócio e desconhecidos preservam sua identidade. O detector compartilhado
  de conflitos permanece; cada serviço decide sua resposta. Não foi recriado um helper
  compartilhado para traduzir erros de persistência.
- Comentários existentes foram movidos com os tratamentos e preservados. Adicionados
  comentários curtos em inglês nos novos métodos. Regras de negócio, consultas e transações
  permaneceram iguais; nenhuma alteração de mensagens foi incluída nessa extração.

Verificação: 225 cenários de diagnóstico em memória sobre 15 operações, incluindo 210
comparações com os tratamentos anteriores, passaram. Conferidas mensagens, classes/status,
retornos de sucesso, dois formatos de conflito e propagação de erros de negócio/desconhecidos.
Tipos, build, lint e Biome dos seis arquivos alterados passaram. Os comandos globais
de formatação e Biome apontam 31 diagnósticos de formatação em arquivos não alterados
nesta entrega. Não houve acesso ao banco nem criação da suíte permanente da fase 2.

## 5. Fase 2 — Testes automatizados de todas as rotas existentes

### Sequência de execução e revisão

1. Implementar o pré-requisito de validação e parar para revisão e validação do responsável.
   Após sua aceitação, commitar essa entrega e iniciar o lote 2.0.
2. Implementar o lote 2.0 e parar novamente para revisão e validação. Após a aceitação,
   commitar esse lote e iniciar os lotes 2.1–2.7.
3. Implementar os lotes 2.1–2.7 em sequência, sem revisão intermediária e sem commits
   automáticos. Solicitar revisão conjunta somente ao finalizar todos; após a validação,
   fazer commits focados por lote e iniciar o lote 2.8.
4. Implementar o lote 2.8 somente depois dessa validação e apresentar a suíte completa
   para revisão final. Não avançar para os requisitos do MVP automaticamente.

Defeitos adicionais devem ser apresentados com reprodução, resultado esperado, resultado
observado e efeito no banco. Aguardar avaliação antes de corrigir produção; não alterar
expectativas dos testes para ocultar a falha. As correções de PATCH abaixo já foram autorizadas.

| Lote | Entrega |
| --- | --- |
| Pré-requisito | Validação de PATCH vazio nos seis módulos e preservação do status omitido de usinas. |
| 2.0 | Infraestrutura Vitest/Supertest, banco isolado, fixtures, servidor e regressões iniciais do pré-requisito. |
| 2.1 | Login, registro e autenticação/autorização compartilhada. |
| 2.2 | Quatro endpoints de usuários. |
| 2.3 | Cinco endpoints de distribuidoras. |
| 2.4 | Cinco endpoints de usinas. |
| 2.5 | Cinco endpoints de empresas. |
| 2.6 | Cinco endpoints de geração, saldos e precisão. |
| 2.7 | Cinco endpoints de alocação, saldos, percentuais e arredondamento. |
| 2.8 | Concorrência, contratos transversais, fluxo completo e GitHub Actions com PostgreSQL 18/Node 24. |

### Pré-requisito — implementado, aguardando revisão

- Os seis schemas de atualização exigem ao menos um valor diferente de `undefined` após
  o processamento dos campos. `{}`, corpo ausente, somente campos desconhecidos e campos
  conhecidos apenas com `undefined` são rejeitados; valores válidos `0`/`null` são preservados.
- O refinamento retorna `ZodError`, tratado pelo middleware existente como 400, com
  `message: 'Validation Error'` e uma issue `custom` na raiz com a mensagem
  `At least one field must be provided for update`. Corpo ausente ou de tipo incorreto
  também retorna 400, com as issues de tipo correspondentes.
- O default `ACTIVE` foi removido somente do campo de atualização de status de usinas;
  a criação mantém esse default. A omissão não acrescenta status à atualização enviada ao serviço.
- Os controllers e a validação UUID nas 18 operações com `:id` foram preservados.
  UUID inválido continua retornando 400, e UUID válido inexistente continua dependendo
  da consulta para retornar 404. Erros de autenticação permanecem 401/403.
- Comentários originais foram preservados; as novas regras receberam comentários curtos
  em inglês. Nenhum endpoint, serviço, migração ou configuração de testes foi modificado.

Verificação: 90 cenários de diagnóstico em memória passaram, exercitando os seis schemas,
os controllers, o middleware de erros, os 18 caminhos de UUID inválido, atualizações parciais,
normalização, campos desconhecidos, valores `0`/`null`, status explícito e default de criação.
Entradas inválidas não chegaram aos serviços nesses cenários. Não houve acesso ao banco,
requisições HTTP reais nem criação da suíte permanente; as regressões integradas com banco
pertencem ao lote 2.0. Tipos, build, lint e Biome dos seis arquivos passaram. Os comandos
globais de formatação e Biome apontam 25 diagnósticos em arquivos não alterados nesta entrega.

Situação: **sem commit, aguardando revisão e validação do responsável**. O lote 2.0 não foi iniciado.

### Ferramentas e isolamento

- Usar Vitest, Supertest e `@types/supertest` como dependências de desenvolvimento.
  Essa decisão substitui a proposta anterior de `node:test`, `node:assert/strict` e `fetch`.
- Usar ambiente Node, isolamento entre arquivos, execução sequencial e nenhuma repetição
  automática de testes que falharem. Definir as variáveis de teste antes de importar a aplicação/Prisma.
- Testes HTTP usam a aplicação Express em `127.0.0.1`, numa porta efêmera, aguardando
  inicialização e garantindo encerramento do servidor e das conexões. Não importar `server.ts`.
- Criar comandos `test`, `test:integration`, `test:watch` e `check:test`. Organizar por módulo
  em `test/integration/`, com configuração TypeScript própria, fora do build de produção.
- Usar o PostgreSQL 18 local com `TEST_DATABASE_URL` para um banco exclusivo chamado
  `energy_credit_manager_test`. Recusar ausência de configuração ou destino equivalente ao
  banco da aplicação, mesmo com credenciais diferentes; validar antes de qualquer limpeza/migração.
- Aplicar as migrações em banco de testes vazio, criar fixtures explícitas por execução
  e limpar somente as sete tabelas de negócio antes de cada teste, preservando `_prisma_migrations`.
  Não executar seed administrativo do usuário. Impedir execuções simultâneas no mesmo banco.
- Não substituir PostgreSQL por SQLite nem considerar mocks prova de transação/concorrência.
- Manter autenticação, serviços, repositórios e limitadores reais. Reiniciar os contadores
  dos limitadores entre testes por `resetKey`; testar separadamente as respostas 429 nos
  limites atuais: login 10, criação 20, consulta 60, exclusão 10 e atualização 20 por minuto.

### Cobertura mínima por rota

Usar a matriz de 31 rotas da auditoria como checklist. Cada método/caminho precisa ter
cenário de sucesso e de falha pertinentes; execução de uma única rota não cobre o módulo.

| Grupo | Cenários obrigatórios |
| --- | --- |
| Login e registro | Credenciais corretas/incorretas, situação inativa, e-mail repetido, empresa inválida e perfil proibido. |
| Todas as protegidas | Token ausente/inválido/expirado, esquema incorreto, usuário removido/inativo e perfis permitidos/proibidos. |
| GET de listas | Lista vazia/preenchida, paginação, limites inválidos e ordenação estável. |
| Todas as 18 rotas com `:id` | GET/PATCH/DELETE: registro existente, UUID inválido → 400 e UUID válido inexistente → 404. |
| Todas as validações Zod de requisição | Corpo/parâmetros/query: obrigatórios, tipos, formatos, enums, limites e null inválidos → 400, conferindo `errors` e sem gravações indevidas. |
| POST/PATCH cadastrais | Dados válidos, campos inválidos, unicidade, referências, bloqueios de histórico; seis PATCH vazios → 400 e omissão de status de usina preservada. |
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

Revisão da fase 1 concluída pelo responsável; P01 e P03 implementadas em 27/10/2026.
Os sete serviços possuem seus próprios métodos privados de tratamento de escrita,
preservando os tratamentos específicos por operação. A proposta histórica P02 permanece
substituída; o tradutor compartilhado removido na F14 não foi reintroduzido.
O pré-requisito da fase 2 está implementado e verificado, sem commit. Aguardar sua revisão
e validação antes de commitar e iniciar o lote 2.0. Depois, seguir os pontos de revisão
definidos na seção 5, incluindo a revisão conjunta dos lotes 2.1–2.7 antes do lote 2.8.
A autorização de commits automáticos exclusiva da fase 1 não se aplica a estas entregas.
Build Linux permanece pendente por indisponibilidade do runtime adequado no ambiente atual.
O banco existente não foi auditado nem migrado. A rejeição de PATCH vazio de D03 foi
explicitamente definida e implementada neste pré-requisito; as demais questões D01–D03
e riscos R01/R02 continuam explícitos na auditoria. Nenhuma correção de dados foi aplicada.
