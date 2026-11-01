# Testes de integração

A suíte usa Vitest 5 e Supertest 7 para executar a aplicação Express real com PostgreSQL.
Ela verifica os contratos das 31 rotas, autenticação, autorização e integridade dos saldos.
Também cobre concorrência coordenada, contratos HTTP, fluxo completo e execução de CI em Linux.

## Preparação local

Requisitos: Node 24, dependências instaladas com `npm ci` e PostgreSQL 18 em execução local.

1. Crie um banco descartável chamado **energy_credit_manager_test** e atribua ao usuário de
   testes permissão para conectar, aplicar migrações e limpar suas tabelas. Por exemplo:

   ```sh
   createdb -h 127.0.0.1 -p 5432 -U TEST_USER energy_credit_manager_test
   ```

2. Copie `.env.test.example` para `.env.test` e configure `TEST_DATABASE_URL` com usuário,
   senha e porta dessa instância. O arquivo local é ignorado pelo Git. Também é possível
   fornecer a variável pelo ambiente; ela prevalece sobre os arquivos locais.
3. Execute:

   ```sh
   npm run test:integration
   npm run check:test
   ```

Não é necessário iniciar `npm run dev`. A suíte abre um servidor em `127.0.0.1` numa
porta temporária e o encerra ao final. Também fecha as conexões e limpa os dados de teste.
O PostgreSQL é um serviço externo: a suíte não inicia nem encerra a instância do usuário.
Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` e `npx.cmd` nos comandos equivalentes.

## Comandos

| Comando | Comportamento |
| --- | --- |
| `npm test` | Executa a suíte uma vez. |
| `npm run test:integration` | Executa os arquivos de integração; aceita um caminho adicional para filtrar. |
| `npm run test:watch` | Mantém o Vitest observando alterações; não execute outra suíte no mesmo banco. |
| `npm run check:test` | Verifica os tipos dos testes e da aplicação, sem gerar JavaScript. |

O setup gera o cliente Prisma explicitamente e aplica `prisma migrate deploy` antes
de carregar os testes. Para checar tipos num checkout novo antes da primeira suíte,
execute `npx prisma generate`. Não são executados seed, `migrate reset` ou `db push`.

## Isolamento

- O destino precisa ser PostgreSQL local, no banco reservado `energy_credit_manager_test`.
  URLs ausentes, outro nome, destino equivalente ao banco da aplicação e parâmetros que
  possam redirecionar a conexão são rejeitados antes de migrar ou limpar dados.
- A porta padrão é explicitada como 5432 para impedir que `PGPORT` altere o destino validado.
  Somente os parâmetros opcionais `schema=public`, `sslmode` e `application_name` são aceitos.
- Um advisory lock impede duas execuções de manipular o mesmo banco simultaneamente.
- Antes de cada caso, são limpas somente as sete tabelas de negócio; o histórico de
  migrações é preservado. Use somente esse banco descartável para os testes.
- Fixtures são criadas sob demanda pelo Prisma. Senhas usam bcrypt real; tokens de
  fixture são assinados com um segredo novo por execução e passam pelo middleware real.
- Arquivos e casos são sequenciais, sem retries automáticos. Contadores dos limitadores
  reais são reiniciados entre testes pela API `resetKey`, sem desativar o rate limiting.
- Não há mocks de autenticação, serviços, repositórios ou banco.

## Validação de entrada e isolamento

- Recusa de destinos inseguros, lock exclusivo, limpeza e preservação das migrações.
- Requisição sem token e consulta autenticada a lista vazia.
- Reset dos contadores reais para isolamento entre cenários.
- PATCH vazio, sem corpo, somente com campos desconhecidos e com dado reconhecido inválido
  nos seis módulos, conferindo 400/Zod e nenhuma alteração nas sete tabelas.
- UUID inválido nas 18 operações GET/PATCH/DELETE por ID, com resposta 400 e banco inalterado.
- Preservação de status omitido nas usinas inativas/em manutenção e default ACTIVE na criação.
- Atualizações válidas com zero e null, incluindo verificação dos saldos energéticos.

Esses contratos de entrada e isolamento são exercitados junto aos testes por módulo.

## Cobertura por módulo

Veja a [matriz por rota](route-coverage.md) para os cenários de sucesso e falha de cada endpoint.

- `auth.test.ts`: login/registro, defaults, senha, vínculo, unicidade e validações.
- `access-control.test.ts`: autenticação nas 30 rotas protegidas e perfis proibidos;
  perfil atual do banco prevalece sobre o perfil antigo do token.
- `users.test.ts`, `distributors.test.ts`, `power-plants.test.ts` e `client-companies.test.ts`:
  consultas, paginação, IDs, criação/alteração/exclusão e regras cadastrais pertinentes.
- `monthly-generations.test.ts`: geração, movimentos, saldos de origem/destino e Decimal.
- `credit-allocations.test.ts`: base de rateio, percentuais padrão/explícitos, arredondamento,
  disponibilidade, correções e devolução de energia na exclusão.
- `expectRejected` compara as sete tabelas antes/depois das rejeições. Os contratos comuns
  em `route-contracts.ts` exercitam HTTP real e não importam schemas para derivar expectativas.
- `expectEnergyIntegrity` confere saldos contra a soma dos lançamentos persistidos.
  Casos de saldo danificado usam fixtures explicitamente inconsistentes para verificar
  recusa sem reparo; esses casos não são apresentados como dados íntegros.

Essa é a cobertura funcional por rota, sem promessa de 100% de linhas. Os testes de
concorrência e contratos transversais estão descritos abaixo.

## Concorrência, contratos HTTP e fluxo completo

- `concurrency.test.ts`: duas alocações disputando disponibilidade; redução/exclusão de
  geração versus alocação; duas correções da mesma geração. Uma sessão auxiliar segura
  a linha do saldo e consulta `pg_blocking_pids` até confirmar duas transações bloqueadas,
  incluindo bloqueios indiretos. Só então libera o gate. Não se presume sobreposição
  apenas por iniciar duas promises, e não há retry automático para esconder conflitos.
- `postgres.ts`: conexões auxiliares validam o banco efetivo. Um trigger temporário de
  teste rejeita aumentos do total alocado para comprovar rollback após escritas anteriores,
  inclusive após debitar o saldo de origem durante uma movimentação. O bloco `finally`
  remove trigger/função e fecha a conexão; nada é adicionado às migrações de produção.
- `http-contracts.test.ts`: JSON malformado (400) e corpo acima do limite real (413) nos
  13 endpoints de escrita, encoding/charset não suportados (415), erro inesperado (500)
  sem exposição de detalhes e rollback real. Apenas o logger é observado com spy;
  autenticação, serviços, repositórios e PostgreSQL permanecem reais.
- `rate-limits.test.ts`: quotas reais 10/20/60/10/20 por minuto, cabeçalhos, próximo pedido
  com 429, contador compartilhado entre recursos e banco inalterado no bloqueio. Login
  incorreto e GET sem token também consomem quota. Sem relógio falso ou store substituído;
  o teste usa `resetKey` para isolamento, sem aguardar a expiração natural de um minuto.
- `energy-workflow.test.ts`: somente o primeiro ADMIN vem de fixture. Login, cadastros,
  usuários, geração, alocação por ANALYST, consultas, correção/movimentação e exclusões
  acontecem por HTTP. Saldos históricos zero continuam impedindo excluir a distribuidora,
  e CLIENT continua sem acesso às rotas administrativas atuais.

O gate de concorrência tem prazo de três segundos para comprovar os bloqueios e sempre
aguarda as requisições terminarem antes da limpeza. Não execute outra suíte no mesmo banco.

## GitHub Actions

`.github/workflows/ci.yml` executa em PRs, pushes na `main` e disparos manuais:

1. Checkout novo em Ubuntu 24.04, Node 24 e `npm ci`.
2. Cliente Prisma gerado explicitamente, tipos da aplicação/testes, build e lint.
3. Biome rigoroso nos testes/configuração e em todos os arquivos suportados alterados no PR.
4. Relatório global de formatação como aviso. Problemas no restante do repositório não
   bloqueiam o job por essa verificação, mas arquivos editados são verificados rigorosamente.
5. Toda a suíte contra um PostgreSQL 18 descartável novo, com banco reservado, migrações
   reais, sem seed administrativo e com segredo JWT novo gerado pelo harness.

O job usa somente `TEST_DATABASE_URL`; `DATABASE_URL` fica restrita ao passo de geração
do cliente. As credenciais fixas do workflow pertencem apenas ao serviço descartável de CI.
Os resultados e logs de cada verificação ficam disponíveis na execução do workflow no GitHub Actions.
