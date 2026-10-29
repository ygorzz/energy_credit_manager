# Testes de integração

A suíte usa Vitest 5 e Supertest 7 para executar a aplicação Express real com PostgreSQL.
Os lotes 2.1–2.7 acrescentam testes funcionais das 31 rotas à infraestrutura do lote 2.0.
Concorrência coordenada, contratos transversais completos e GitHub Actions pertencem ao lote 2.8.

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

## Cobertura inicial do lote 2.0

- Recusa de destinos inseguros, lock exclusivo, limpeza e preservação das migrações.
- Requisição sem token e consulta autenticada a lista vazia.
- Reset dos contadores reais para isolamento entre cenários.
- PATCH vazio, sem corpo, somente com campos desconhecidos e com dado reconhecido inválido
  nos seis módulos, conferindo 400/Zod e nenhuma alteração nas sete tabelas.
- UUID inválido nas 18 operações GET/PATCH/DELETE por ID, com resposta 400 e banco inalterado.
- Preservação de status omitido nas usinas inativas/em manutenção e default ACTIVE na criação.
- Atualizações válidas com zero e null, incluindo verificação dos saldos energéticos.

Essas regressões iniciais são complementadas pelos testes por módulo descritos abaixo.

## Cobertura dos lotes 2.1–2.7

Veja a [matriz por rota](route-coverage.md) e o [acompanhamento da fase](../docs/progresso-fase2.md).

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

Isso representa cobertura funcional por rota, sem promessa de 100% de linhas ou prova
de concorrência. O aceite da fase 2 ainda depende de 2.8 e de revisão. Novos defeitos de
produção devem ser apresentados ao responsável antes de correções.
