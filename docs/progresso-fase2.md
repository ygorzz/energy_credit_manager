# Progresso da fase 2

## Pré-requisito — validado e commitado

O responsável validou e commitou a rejeição de PATCH vazio e a preservação de status
omitido em usinas no commit `47c45d7`. A entrega incluiu 90 diagnósticos em memória;
suas regressões com HTTP e PostgreSQL reais foram adicionadas no lote 2.0.

## Lote 2.0 — concluído e commitado

Situação: **commits autorizados pelo responsável em 28/10/2026**, com divisão por
finalidade. Os lotes 2.1–2.7 ainda não foram iniciados.

### Implementação

- Vitest 5.0.5, Supertest 7.3.1 e tipos de Supertest 7.2.1 como dependências de desenvolvimento.
  Nenhuma versão de pacote já presente no lockfile foi alterada.
- Configuração Node com arquivos isolados e sequenciais, sem retries automáticos.
- `npm test`, `test:integration`, `test:watch` e `check:test`, com tipos de testes separados
  do build de produção. Lint passa a incluir testes e configuração do Vitest.
- Guarda de URL antes da conexão/migração/limpeza, conferência do banco efetivo, bloqueio
  exclusivo por execução, geração do cliente e aplicação das migrações existentes.
- Banco local reservado `energy_credit_manager_test`, limpeza das sete tabelas de negócio,
  fixtures consistentes e encerramento de servidor/conexões. Não foram usados seed ou reset.
- HTTP em porta efêmera IPv4; autenticação, serviços, persistência e limitadores reais.
  Contadores dos limitadores são reiniciados entre cenários pela API `resetKey`.
- `.env.test.example` versionado e `.env.test` local ignorado, sem fallback para o banco
  da aplicação. O segredo JWT de teste é gerado a cada execução.
- Instruções atualizadas em `AGENTS.md` e [test/README.md](../test/README.md).

### Verificação

As duas execuções completas passaram com **65 testes em dois arquivos**:

| Grupo | Casos |
| --- | --- |
| Infraestrutura | 15: destinos inválidos/equivalentes, credenciais não expostas pela guarda, lock exclusivo, limpeza/histórico, autenticação, consulta HTTP e reset de contadores. |
| PATCH inválido e UUID | 42: seis módulos com objeto vazio, corpo ausente, campos desconhecidos, campo reconhecido inválido e UUID inválido em GET/PATCH/DELETE. |
| Atualizações parciais válidas | 8: status INACTIVE/MAINTENANCE preservado, default ACTIVE de criação, zeros em empresa/geração/alocação e null em percentual/vínculo de usuário. |

Nos casos rejeitados, snapshots das sete tabelas permaneceram iguais. Nos cenários de
energia, foram conferidos os saldos persistidos. Nenhum mock de aplicação ou persistência
foi utilizado. Isso é cobertura inicial do pré-requisito, não cobertura completa das 31 rotas.

Também foi exercitado o comando Vitest com destino inválido: a inicialização recusou
a configuração antes de executar testes e não revelou a senha fictícia usada no diagnóstico.

Tipos da aplicação, tipos dos testes, build, lint e Biome dos arquivos novos/modificados
passaram. `format:check` e `biome:check` globais ainda apontam **25 diagnósticos de formatação
em arquivos não alterados**. Nenhum arquivo de produção em `src/` foi modificado neste lote.

O banco exclusivo terminou com **15 migrações aplicadas**, as sete tabelas de negócio vazias,
zero conexões de teste remanescentes e o advisory lock liberado.

### Ambiente desta execução

Foi utilizada uma instância PostgreSQL 18 isolada em `127.0.0.1:55439`, que já existia como
ambiente descartável da auditoria. Somente o novo banco `energy_credit_manager_test` foi
criado/migrado para esta suíte. O banco da aplicação não foi acessado nem migrado.

Essa instância foi encerrada após a verificação, preservando seu diretório e o banco vazio.
Nesta máquina, para repetir usando o `.env.test` local atual, inicie-a na raiz do projeto:

```powershell
pg_ctl start -D .phase1-validation/pgdata-isolated -l .phase1-validation/phase2-postgres.log -o "-p 55439 -h 127.0.0.1"
npm run test:integration
pg_ctl stop -D .phase1-validation/pgdata-isolated -m fast
```

O diretório descartável não é versionado. Em outro ambiente, siga [test/README.md](../test/README.md)
para criar o banco em seu PostgreSQL local e configurar sua própria URL. A suíte não depende
da porta 55439 nem desse diretório.

### Pendências fora do lote

- A auditoria de dependências informou 10 alertas: 3 moderados, 6 altos e 1 crítico.
  Todos os pacotes apontados já existiam nas mesmas versões do lockfile anterior:
  `@prisma/config`, `body-parser`, `deepmerge-ts`, `fast-uri`, `ip-address`, `mysql2`,
  `prisma`, `proxy-addr`, `qs` e `zod`. Nenhum alerta foi corrigido automaticamente;
  atualizações de produção dependem de avaliação separada.
- Cobertura completa por módulo permanece nos lotes 2.1–2.7. Concorrência coordenada,
  limites 429 completos, fluxo completo e GitHub Actions permanecem no lote 2.8.

### Divisão dos commits

1. `ff4d021` — `test: add isolated Vitest and Supertest integration infrastructure`:
   dependências, configuração, proteção do banco, ciclo de vida HTTP/PostgreSQL, fixtures,
   instruções e 15 testes da infraestrutura.
2. `test: cover patch validation and invalid route identifiers`: 50 testes de regressão
   de PATCH/UUID, atualizações parciais válidas e registro da conclusão do lote neste plano.

Antes dos commits, tipos da aplicação/testes, build, lint e Biome dos arquivos do lote
passaram novamente. O código dos testes permaneceu igual ao das duas execuções completas
com 65 testes aprovados; a suíte não foi repetida apenas para dividir os commits.
