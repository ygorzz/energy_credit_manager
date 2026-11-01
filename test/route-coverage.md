# Matriz funcional das 31 rotas — lotes 2.1–2.8

As respostas abaixo são verificadas por HTTP com PostgreSQL real. `access-control.test.ts`
acrescenta 401/403 a todas as 30 rotas protegidas e confere ausência de alterações no banco.
`patch-validation.test.ts` preserva as regressões do pré-requisito (incluindo status de usina).
Os contratos de cada módulo conferem Zod 400, paginação, UUID inválido (400), UUID válido
inexistente (404) e preservação das sete tabelas em rejeições.

| Rota | Sucesso | Falhas de entrada/negócio | Arquivo do módulo |
| --- | --- | --- | --- |
| POST /auth/login | 200, token utilizável | 400, 401, 403 | auth.test.ts |
| POST /auth/register | 201, senha protegida | 400, 404, 409 | auth.test.ts |
| GET /users | 200, páginas estáveis | 400 | users.test.ts |
| GET /users/:id | 200, dados públicos | 400, 404 | users.test.ts |
| PATCH /users/:id | 200, senha/vínculo/perfil | 400, 404, 409 | users.test.ts |
| DELETE /users/:id | 200, registro removido | 400, 404 | users.test.ts |
| POST /distributors | 201, nome normalizado | 400, 409 | distributors.test.ts |
| GET /distributors | 200, vazio/páginas | 400 | distributors.test.ts |
| GET /distributors/:id | 200 | 400, 404 | distributors.test.ts |
| PATCH /distributors/:id | 200, nome persistido | 400, 404, 409 | distributors.test.ts |
| DELETE /distributors/:id | 200 | 400, 404, 409 por vínculos | distributors.test.ts |
| POST /power-plants | 201, capacidade/status | 400, 404, 409 | power-plants.test.ts |
| GET /power-plants | 200, vazio/páginas | 400 | power-plants.test.ts |
| GET /power-plants/:id | 200 | 400, 404 | power-plants.test.ts |
| PATCH /power-plants/:id | 200, campos/vínculo | 400, 404, 409 por nome/histórico | power-plants.test.ts |
| DELETE /power-plants/:id | 200 | 400, 404, 409 por geração | power-plants.test.ts |
| POST /client-companies | 201, CNPJ/percentual | 400, 404, 409 | client-companies.test.ts |
| GET /client-companies | 200, vazio/páginas | 400 | client-companies.test.ts |
| GET /client-companies/:id | 200 | 400, 404 | client-companies.test.ts |
| PATCH /client-companies/:id | 200, campos/padrão | 400, 404, 409 por CNPJ/histórico | client-companies.test.ts |
| DELETE /client-companies/:id | 200, vínculos opcionais anulados | 400, 404, 409 por CLIENT/alocação | client-companies.test.ts |
| POST /monthly-generations | 201, saldo criado/somado | 400, 404, 409 | monthly-generations.test.ts |
| GET /monthly-generations | 200, vazio/páginas | 400 | monthly-generations.test.ts |
| GET /monthly-generations/:id | 200 | 400, 404 | monthly-generations.test.ts |
| PATCH /monthly-generations/:id | 200, correções/movimentos/saldos | 400, 404, 409 | monthly-generations.test.ts |
| DELETE /monthly-generations/:id | 200, saldo ajustado | 400, 404 | monthly-generations.test.ts |
| POST /credit-allocations | 201, percentual e saldo corretos | 400, 404, 409 | credit-allocations.test.ts |
| GET /credit-allocations | 200, vazio/páginas | 400 | credit-allocations.test.ts |
| GET /credit-allocations/:id | 200 | 400, 404 | credit-allocations.test.ts |
| PATCH /credit-allocations/:id | 200, delta/movimentos/percentual | 400, 404, 409 | credit-allocations.test.ts |
| DELETE /credit-allocations/:id | 200, energia devolvida | 400, 404, 409 por saldo inconsistente | credit-allocations.test.ts |

## Contratos transversais do lote 2.8

| Grupo | Evidência |
| --- | --- |
| Concorrência | `concurrency.test.ts`: 4 disputas com bloqueios observados no PostgreSQL, um sucesso e um 409, sem escrita parcial ou combinação de deltas obsoletos. |
| HTTP de escrita | `http-contracts.test.ts`: 400 por JSON malformado e 413 por corpo excessivo nos 13 POST/PATCH; 415 por encoding/charset e 500 sanitizado por falha real de persistência. |
| Rollback | `http-contracts.test.ts`: trigger de teste falha após criar alocação ou após atualizar o registro e debitar a origem de um movimento; todas as tabelas preservadas. |
| Rate limiting | `rate-limits.test.ts`: quotas 10/20/60/10/20, pedido seguinte 429, Retry-After, compartilhamento entre recursos e contagem de tentativas sem autenticação. |
| Fluxo completo | `energy-workflow.test.ts`: do login aos lançamentos, movimento entre meses, correção e exclusões permitidas, incluindo perfis e integridade dos saldos. |
| CI/Linux | `.github/workflows/integration.yml`: checkout novo, npm ci, geração Prisma, tipos/build/lint/formatação e suíte com PostgreSQL 18 em Ubuntu/Node 24. Resultado remoto consultado no PR da entrega. |

Os testes não prometem cada erro de infraestrutura em cada operação nem todas as
intercalações possíveis de concorrência. O aceite final da fase 2 exige revisão no GitHub.
Decisões de produto pendentes, como recálculo de percentuais históricos (D01), não foram
resolvidas implicitamente pelos testes.
