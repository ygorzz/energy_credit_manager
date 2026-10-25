# Auditoria técnica da API atual

Data: 24/10/2026. Estado: F01–F21 implementados e commitados; aguardando revisão da fase 1.

Consultar [progresso-fase1.md](progresso-fase1.md) para o estado das correções e evidências.
As descrições abaixo preservam a situação encontrada na auditoria inicial.

O acompanhamento contém a correspondência achado/commit, as verificações reais no PostgreSQL
isolado e os limites da entrega. Build Linux e análise do banco existente permanecem pendentes;
não inferir que riscos R01/R02 ou decisões D01–D03 foram resolvidos pelas correções.

Sequência de trabalho: [plano de operação](plano-operacao.md).
Requisitos futuros preservados: [MVP de métricas energéticas](requisitos-mvp.md).

## 1. Abrangência e limites

Foram lidos os 51 arquivos próprios de `src/`: os 7 módulos com suas rotas, controllers,
DTOs, serviços e repositórios, além de inicialização, banco, middlewares, erros, tipos e schemas.
Também foram revisados schema, seed, configuração Prisma, todas as 14 migrações SQL,
lock de migrações, manifestos, TypeScript, Biome, configurações do VS Code, `.gitignore`,
`AGENTS.md` e o documento de requisitos. O `package-lock.json` foi analisado como JSON:
316 entradas, dependências diretas coerentes com o manifesto e sem integridade ausente
nas entradas com URL resolvida. Isso não representa auditoria do código das dependências.

`test/e2e/` existe, mas está vazio; não há suíte ou comando de testes configurado.
Não foram auditados como código próprio `node_modules/`, `dist/` ou o cliente Prisma gerado.
Não foram expostos valores do `.env`, nem consultados ou modificados dados do banco real.
As configurações auxiliares de skills não são parte do comportamento da API.

Classificação de evidência:

- **Reproduzido:** comportamento exercitado em memória ou via HTTP local com banco simulado.
- **Estático:** comportamento identificado diretamente no código, schema ou SQL.
- **Pendente no PostgreSQL:** interleaving, migração ou estado de dados que exige banco isolado.

Prioridades: P1 para autorização, integridade e execução; P2 para validação e contrato da API;
P3 para manutenção. Um achado estático não implica que o banco atual já esteja inconsistente.

## 2. Inventário de todas as rotas

`A` = ADMIN; `N` = ANALYST; `CLIENT` não acessa as rotas protegidas atuais.
Essa restrição atual não é classificada como bug: o acesso do cliente faz parte do MVP futuro.

| # | Método | Rota | Acesso atual |
| --- | --- | --- | --- |
| 01 | POST | `/auth/login` | Público |
| 02 | POST | `/auth/register` | A |
| 03 | GET | `/users` | A, N |
| 04 | GET | `/users/:id` | A, N |
| 05 | PATCH | `/users/:id` | A |
| 06 | DELETE | `/users/:id` | A |
| 07 | GET | `/distributors` | A, N |
| 08 | GET | `/distributors/:id` | A, N |
| 09 | POST | `/distributors` | A |
| 10 | PATCH | `/distributors/:id` | A |
| 11 | DELETE | `/distributors/:id` | A |
| 12 | GET | `/power-plants` | A, N |
| 13 | GET | `/power-plants/:id` | A, N |
| 14 | POST | `/power-plants` | A |
| 15 | PATCH | `/power-plants/:id` | A |
| 16 | DELETE | `/power-plants/:id` | A |
| 17 | GET | `/client-companies` | A, N |
| 18 | GET | `/client-companies/:id` | A, N |
| 19 | POST | `/client-companies` | A |
| 20 | PATCH | `/client-companies/:id` | A |
| 21 | DELETE | `/client-companies/:id` | A |
| 22 | GET | `/monthly-generations` | A, N |
| 23 | GET | `/monthly-generations/:id` | A, N |
| 24 | POST | `/monthly-generations` | A |
| 25 | PATCH | `/monthly-generations/:id` | A |
| 26 | DELETE | `/monthly-generations/:id` | A |
| 27 | GET | `/credit-allocations` | A, N |
| 28 | GET | `/credit-allocations/:id` | A, N |
| 29 | POST | `/credit-allocations` | A, N |
| 30 | PATCH | `/credit-allocations/:id` | A |
| 31 | DELETE | `/credit-allocations/:id` | A |

Todas foram inspecionadas de ponta a ponta no código. Isso não significa que todas já
tenham testes HTTP ou que a integração com o PostgreSQL tenha sido executada.

## 3. Achados prioritários

### F01 — P1 — Token ignora alterações e exclusão do usuário

Evidência: `src/middlewares/auth.middleware.ts:21` e `src/modules/Auth/auth.service.ts:41`.
O middleware aceita o ID e o perfil do JWT sem consultar existência, situação ou perfil atual.
Desativar, cancelar, excluir ou rebaixar um ADMIN não impede o uso do token antigo até expirar
(uma hora). A checagem de situação no login só impede novos logins.

Reprodução: um JWT de teste assinado com ID sem usuário persistido acessou `GET /distributors`
com HTTP 200, usando repositório simulado. Não se trata de possibilidade de forjar a assinatura.
Correção proposta: validar o usuário atual em cada acesso e autorizar pelo perfil atual.

Andamento de F01 — **concluído e commitado** (24/10/2026):

- Alterado somente o middleware `src/middlewares/auth.middleware.ts` no código da aplicação.
- Após verificar o JWT, consulta `UserRepository.findById` em cada requisição autenticada.
- Usuário inexistente retorna 401; situação INACTIVE ou CANCELED retorna 403.
- `req.user` recebe ID e perfil do registro atual, de modo que `authorize` não usa o perfil
  antigo contido no token. Uma alteração de perfil vale para a próxima requisição autenticada.
- Erros na consulta são encaminhados ao handler global e não mascarados como token inválido.
- Verificados 14 cenários em memória e 8 requisições HTTP locais com banco simulado, incluindo
  o mesmo token após mudanças de situação, exclusão e perfil; todos passaram.
- Tipos, lint, build e Biome no arquivo alterado passaram. A verificação global de formatação
  ainda falha com 54 diagnósticos preexistentes nos demais arquivos (eram 55 na linha de base).
- Após revisão, os erros específicos de cabeçalho/token ausente foram preservados; a mensagem
  genérica permaneceu para falhas de verificação do JWT.
- Nenhum banco real foi acessado, nenhuma migração foi aplicada e a suíte permanente da fase 2
  não foi criada.
- O responsável confirmou seus ajustes e realizou o commit `0456a14`,
  `fix: validate user on auth middleware`, verificado no histórico antes de iniciar F16.

### F02 — P1 — Troca de distribuidora da usina desassocia o histórico dos saldos

Evidência: `src/modules/Power-Plants/power-plant.service.ts:56` e
`src/modules/Monthly-Generations/monthly-generation.service.ts:79` e `:151`.
O PATCH da usina permite trocar `distributorId` sem tratar gerações existentes. As gerações
continuam incluídas no saldo da distribuidora anterior; futuras alterações ou exclusões
resolvem a distribuidora pelo cadastro atual e podem debitar outro saldo ou retornar 404.

Evidência estática. Correção inicial proposta: bloquear a troca quando existir geração,
sem criar um processo de transferência histórica neste ciclo.

### F03 — P1 — Troca de distribuidora da empresa pode debitar a distribuidora errada

Evidência: `src/modules/Client-Companies/client-company.service.ts:58` e
`src/modules/Credit-Allocations/credit-allocation.service.ts:126` e `:198`.
O PATCH da empresa permite trocar `distributorId` com alocações existentes. Exclusões e
alterações posteriores usam a distribuidora atual da empresa para localizar o saldo original.
Se existir saldo suficiente no novo destino, a operação pode ajustar o saldo errado.

Evidência estática. Correção inicial proposta: bloquear a troca quando existir alocação.
As verificações de F02/F03 devem participar da proteção transacional contra criações concorrentes.

### F04 — P1 — Geração faz validações fora da transação de alteração/exclusão

Evidência: `src/modules/Monthly-Generations/monthly-generation.service.ts:72`, `:81`,
`:104`, `:135`, `:170` e `:193`; o repositório também lê geração sem receber `tx`.
Leituras e verificações podem ficar obsoletas antes da gravação. As transações da geração
não especificam o mesmo isolamento das alocações.

Exemplo de interleaving: a exclusão lê 100 MWh disponíveis; uma alocação de 100 MWh termina;
depois a exclusão inicia sua transação e retira a geração, deixando disponibilidade negativa.
Outro caso é duas correções lerem a mesma geração antiga e aplicarem deltas incompatíveis.

A janela está identificada no código; a reprodução concorrente real está pendente no PostgreSQL.
Correção proposta: leituras e gravações dentro da mesma estratégia transacional, com conflito
controlado e proteção também contra as alterações cadastrais de F02/F03.

### F05 — P1 — Atualização de alocação não valida percentual versus quantidade

Evidência: `src/modules/Credit-Allocations/credit-allocation.service.ts:243`.
O PATCH verifica disponibilidade, mas grava percentual e quantidade sem repetir a validação
da criação. Alterar empresa ou competência também pode manter um percentual incompatível.

Reprodução HTTP: com geração de 100 MWh, o PATCH aceitou 20 MWh e 10%, retornando HTTP 200.
Correção proposta: centralizar a validação numérica e aplicá-la aos dados efetivos do PATCH.

### F18 — P1 — Capitalização do módulo Auth diverge do caminho versionado

Evidência: `src/app.ts:4` importa `./modules/Auth/auth.routes.js`, enquanto o Git registra
`src/modules/auth/auth.routes.ts` e os demais arquivos desse módulo com `auth` minúsculo.
O Windows mascara a diferença; um checkout em filesystem sensível a maiúsculas pode falhar
ao compilar. No build atual, o caminho gerado também usa a capitalização do import.

Confirmado pelo cruzamento entre imports e `git ls-files`; execução Linux ainda não realizada.
Correção proposta: uniformizar imports e caminho versionado, validando checkout Linux na fase 2.

## 4. Validação, respostas e manutenção

### F06 — P2 — Percentual opcional falha por omissão e por null

Evidência: `src/modules/Credit-Allocations/credit-allocation.dto.ts:15` e
`src/modules/Credit-Allocations/credit-allocation.service.ts:34` e `:61`.
O DTO usa `nullable()` sem `optional()`. Com `null`, o serviço resolve o padrão, mas compara
o valor original `null` ao cálculo. Ambas as entradas foram rejeitadas nas verificações;
o caso `null` foi reproduzido via HTTP com padrão correspondente.

Correção: aceitar as duas formas e validar o percentual efetivo cadastrado ou informado.

### F07 — P2 — Igualdade exata rejeita percentuais arredondados

Evidência: `src/modules/Credit-Allocations/credit-allocation.service.ts:58`.
1 MWh sobre 3 MWh produz uma dízima; 33,33% é rejeitado pela comparação estrita com `Number`.
Reproduzido em memória. Correção: aritmética decimal e comparação com duas casas,
arredondando metade para cima, sem alterar a quantidade de energia.

### F08 — P2 — Geração zero não tem tratamento antes da divisão

Evidência: `src/modules/Credit-Allocations/credit-allocation.service.ts:57`.
É permitido lançar geração zero. Uma alocação zero sobre esse saldo calcula `0 / 0` (`NaN`)
e produz erro de percentual incompatível, em vez de explicar a ausência de geração positiva.
Com quantidade positiva, pode ser rejeitada antes por indisponibilidade, também sem essa regra.
Reproduzido em memória. Correção: validar base positiva explicitamente antes do cálculo.

### F09 — P2 — Percentual padrão aceita valores incompatíveis com o banco e com 100%

Evidência: `src/modules/Client-Companies/client-company.dto.ts:20` e
`prisma/schema.prisma:38`. O DTO aceita 12,5 e 150; o banco exige `Int` e o domínio limita
percentual a 100%. Os dois valores passaram no DTO. O decimal pode resultar em erro de
validação do Prisma; 150 é inteiro e não tem restrição correspondente no schema.

Correção mínima: alinhar DTO e schema atual, mantendo padrão inteiro entre 0 e 100.
Percentuais explícitos das alocações continuam decimais; não exigir migração só para o padrão.

### F10 — P2 — Vínculo de usuário cliente não é validado

Evidência: `src/modules/Users/user.dto.ts:16` e `:25`,
`src/modules/Auth/auth.service.ts:19` e `prisma/schema.prisma:17`.
O DTO aceita CLIENT com `companyId: null` e IDs de empresa que não são UUIDs, sem regra
condicional ou validação do estado efetivo no PATCH. Ambos os casos passaram no DTO.
O vínculo opcional também permite que a exclusão da empresa deixe clientes sem empresa.

Correção: exigir empresa existente para CLIENT, validar UUID e impedir que exclusões ou
alterações de vínculo deixem clientes ativos órfãos. Não ampliar permissões de consulta agora.

### F11 — P2 — PATCH de geração pode retornar sem o registro atualizado

Evidência: `src/modules/Monthly-Generations/monthly-generation.service.ts:193`.
No caminho com mudança de quantidade e mesma competência/distribuidora, o callback não retorna
o resultado do repositório. O controller recebe `undefined`, omitido na serialização JSON.
Reprodução HTTP: resposta continha mensagem, sem `monthlyGenerationUpdated`.

Correção: retornar o registro atualizado em todos os caminhos de sucesso.

### F12 — P2 — Atualização e exclusão de geração retornam HTTP 201

Evidência: `src/modules/Monthly-Generations/monthly-generations.controller.ts:62` e `:84`.
Os demais módulos usam 200 nessas operações. O PATCH foi reproduzido com 201.
Correção: usar 200 com o corpo atual para PATCH e DELETE, reservando 201 para criação.

### F13 — P2 — Conversão de Decimal para Number perde precisão nos ajustes de geração

Evidência: `src/modules/Monthly-Generations/monthly-generation.service.ts:101`, `:190` e `:238`.
Os ajustes convertem valores decimais em ponto flutuante antes de atualizar o saldo.
Reprodução em memória com entradas aceitas pelo DTO: alterar geração de 10 para `1e-16`
produz decremento 10, deixando consolidado 0 e geração `1e-16`.

Correção: manter `Prisma.Decimal` durante os deltas e gravações. Esta correção não promete
recuperar precisão já perdida por valores históricos ou por entradas JSON numéricas.

### F14 — P2 — Erros esperados de unicidade e referência escapam como HTTP 500

Exemplos estáticos, considerando o handler global como destino:

| Operação | Tratamento ausente |
| --- | --- |
| Criar usina com distribuidora inexistente | `Power-Plants/power-plant.service.ts:10`: P2003. |
| Renomear distribuidora para nome existente | `Distributors/distributor.service.ts:60`: P2002. |
| Atualizar e-mail de usuário para um existente | `Users/user.service.ts:35`: P2002. |
| Registrar/alterar usuário com empresa inexistente | `Auth/auth.service.ts:14` e `Users/user.service.ts:35`: P2003. |
| Excluir distribuidora, usina ou empresa com dependências restritas | Métodos de exclusão nos três serviços: P2003. |

Os caminhos tratam apenas parte dos códigos conhecidos, repassando os demais ao erro genérico.
Correção: padronizar 409 para unicidade/dependências e 404 para referência inexistente,
conforme a causa da operação. Confirmar códigos e respostas com PostgreSQL na fase 2.

### F15 — P2 — Erros do parser HTTP viram 500 e podem expor o corpo nos logs

Evidência: `src/middlewares/error-handler.middleware.ts:11` e `:25`.
O handler só reconhece `BaseError` e `ZodError`. JSON malformado foi reproduzido via HTTP
e retornou 500; deveria retornar 400. O limite do parser também requer preservar 413 para
corpo excessivo. `console.log(error)` imprime o erro completo; erros de parsing podem carregar
o corpo recebido, inclusive em login.

Correção: normalizar tipos conhecidos do parser sem confiar em qualquer status arbitrário,
preservar resposta genérica para erro interno e registrar metadados sem corpo ou credenciais.

### F16 — P2 — Middleware não exige esquema Bearer ou validação das claims

Evidência: `src/middlewares/auth.middleware.ts:16` e `:21`.
O código usa o segundo trecho do cabeçalho sem conferir o esquema. `Basic <JWT válido>`
acessou a rota com HTTP 200. Um cast TypeScript também não valida ID e perfil em runtime.
Isso não permite contornar a assinatura do JWT, mas aceita formato inválido de autenticação.

Correção: validar o formato Bearer, claims esperadas e usuário atual, junto de F01.

Andamento de F16 — **concluído e commitado** (24/10/2026):

- O middleware exige esquema Bearer, sem diferenciar maiúsculas/minúsculas, seguido de
  um ou mais espaços e exatamente um token. Outros esquemas ou trechos adicionais retornam 401.
- O novo schema `src/shared/schemas/auth-token.dto.ts` valida ID como UUID e perfil como
  ADMIN, ANALYST ou CLIENT, usando os valores de `UserRoles` do Prisma.
- O resultado de `jwt.verify` passa por validação Zod em runtime, substituindo o cast
  `as NewJwtPayload`. Claims ausentes ou de tipo/valor inválido são rejeitadas antes da consulta.
- As mensagens existentes foram preservadas; falhas de schema respondem `Invalid token payload`.
  Falhas de assinatura, expiração ou da própria leitura do JWT mantêm a resposta genérica 401.
- `src/types.d.ts` agora define `req.user.id` como string e o perfil como `UserRoles`.
- F01 permanece válido: o perfil do token precisa ser reconhecido, mas a autorização usa
  o perfil atual do banco; mudanças de situação/perfil e erros de consulta mantêm seu tratamento.
- Passaram 47 verificações em memória e 17 requisições HTTP com banco simulado, incluindo
  um token emitido pelo próprio serviço de login, cabeçalhos inválidos, claims inválidas,
  assinatura/expiração e regressões de F01. Entradas inválidas não consultaram o banco simulado.
- Tipos, lint, build e Biome dos três arquivos alterados/criados passaram. A formatação global
  ainda aponta 53 diagnósticos preexistentes nos demais arquivos (54 antes de formatar o tipo alterado).
- Não houve acesso ao banco real, mudança de schema/migrações ou criação da suíte permanente.
- Commit sugerido: `fix: validate authorization header and jwt payload`.
- Commit realizado pelo responsável: `e1df062`, `fix: validate authorization header and jwt payload`.
- Lote 1.1 encerrado. O fluxo de execução autônoma aplica-se apenas aos demais achados da fase 1.

### F17 — P2 — Paginação não tem ordenação determinística

Evidência: métodos `findAll` nos repositórios de usuários, distribuidoras, usinas, empresas,
gerações e alocações. Usam `skip`/`take` sem `orderBy`; o banco não garante ordem entre chamadas.
O repositório de saldo, ainda sem rota, repete o padrão.

Correção: incluir ordenação estável por ID como base mínima. Mudanças concorrentes ainda
podem deslocar páginas por offset; paginação por cursor não entra nesta correção.

### F19 — P2 — Defaults do schema não estão representados nas migrações

Evidência: `prisma/schema.prisma:68` e `:69` definem `@default(0)`, mas a criação de
`MonthlyDistributorBalance`, em `20260925232810.../migration.sql:23`, não define esses defaults.
Não existe migração posterior no repositório. O `prisma validate` não detecta essa divergência
entre histórico SQL e schema; o estado do banco real não foi inspecionado.

Correção: verificar replay em banco isolado e criar migração aditiva para os defaults,
sem reescrever migrações potencialmente aplicadas.

### F20 — P2 — Seed usa credenciais fixas e falha ao ser repetido

Evidência: `prisma/seed.ts:4` e `:7`.
O seed contém senha e identificação administrativas fixas e sempre executa `create`.
Executá-lo novamente com o mesmo usuário falha por unicidade. O seed não foi executado.

Correção: configuração explícita das credenciais de bootstrap e execução idempotente que
não redefina silenciosamente a senha de um administrador existente.

### F21 — P3 — Formatação e orientações de desenvolvimento estão inconsistentes

`format:check` encontrou 55 diagnósticos preexistentes. Há aspas, indentação, quebras de linha
e outros detalhes fora do padrão. `AGENTS.md` também dizia que alocações não tinham repositório,
apesar de `credit-allocation.repository.ts` existir, e não mencionava a pasta de testes vazia.

Correção proposta: normalizar formatação em mudança isolada; alinhar imports com Biome.
Na entrega inicial da auditoria, as descrições obsoletas do AGENTS e a prioridade de trabalho
foram atualizadas. Durante F01, o arquivo de autenticação alterado foi formatado; restam
54 diagnósticos nos demais arquivos naquele momento. F16 também formatou `src/types.d.ts`,
reduzindo o total para 53. A normalização global de F21 continua pendente.

## 5. Riscos e decisões que não são bugs confirmados do estado atual

- **R01 — Migrações com dados existentes:** há DROP/ADD de colunas obrigatórias sem cópia
  dos dados. A migração de perfil de setembro recria todos os perfis como CLIENT; outras
  podem falhar em tabelas populadas. Não executar novamente nem reescrever o histórico sem
  saber o que foi aplicado. Verificar replay vazio e estratégia de upgrade separadamente.
- **R02 — Unidade de capacidade histórica:** a migração `20260918000000` renomeia kW para MW
  sem conversão numérica. É preciso saber qual unidade os dados antigos realmente usavam
  antes de corrigir registros; não multiplicar ou dividir dados por suposição.
- **D01 — Geração alterada após alocação:** aumentar ou reduzir geração muda a base usada no
  cálculo de percentuais de alocações existentes. Definir antes da correção desse caso se
  o percentual é histórico da operação ou se a mudança exige revisão dos lançamentos afetados.
  Quantidade e disponibilidade devem permanecer consistentes em qualquer escolha.
- **D02 — Último administrador e status da usina:** o código permite remover o último ADMIN
  e lançar geração de usina hoje inativa. A segunda situação pode ser legítima em um mês
  histórico. Definir as regras antes de introduzir bloqueios novos.
- **D03 — PATCH vazio e normalização:** os DTOs aceitam atualizações vazias; nome de usuário
  não é aparado, e e-mail é validado antes do trim. São ajustes de contrato de menor prioridade,
  sem justificativa para atrasar integridade de saldo ou ampliar o produto.

Não foram classificados como bugs atuais: ausência de consumo, dashboards, filtros por período
ou endpoints próprios do cliente. São funcionalidades futuras já preservadas nos requisitos.

## 6. Verificações executadas nesta auditoria

| Verificação | Resultado |
| --- | --- |
| `npm run check` | Passou. |
| `npm run lint` | Passou; 66 arquivos verificados pelo Biome, incluindo gerados disponíveis. |
| `npm run build` | Passou no Windows. |
| `prisma validate` | Passou; não verifica o banco nem replay das migrações. |
| `npm run format:check -- --max-diagnostics=0` | Falhou com os 55 diagnósticos preexistentes. |
| Imports versus caminhos do Git | Uma divergência de capitalização no import de Auth pelo app. |
| HTTP local com repositórios simulados | Sete requisições pontuais executadas; sem acesso ao banco. |
| DTOs e aritmética decimal em memória | Reproduções de validação, vínculo e precisão descritas acima. |

As requisições locais exercitaram autenticação, formato do cabeçalho, parsing JSON, criação
de alocação com número e null, PATCH de alocação e PATCH de geração. A primeira tentativa
foi bloqueada pelo sandbox em loopback; a repetição autorizada concluiu as verificações.
Isso não substitui a suíte futura das 31 rotas, testes de integração, auditoria de dependências
ou testes de carga. Nenhuma migração ou seed foi aplicada durante a auditoria inicial.
As correções posteriores de F01/F16 e suas verificações estão registradas nas seções dos achados.
