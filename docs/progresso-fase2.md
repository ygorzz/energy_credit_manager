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

## Execução dos lotes 2.1–2.7

Em 28/10/2026, o responsável autorizou um commit ao concluir e verificar cada lote,
antes de iniciar o próximo. A revisão conjunta permanece ao final de 2.7 e bloqueia o
início de 2.8. Os commits não autorizam a fase 3.

### Lote 2.1 — autenticação e autorização

- Login: token assinado com validade de uma hora e uso real em rota protegida; credenciais
  incorretas, contas inativas/canceladas e entradas Zod inválidas.
- Registro: três perfis, defaults CLIENT/ACTIVE, vínculo de empresa, senha com bcrypt,
  resposta sem dados de senha, e-mail repetido (409), referência inexistente (404) e
  formatos, campos obrigatórios, enums, limites e vínculo CLIENT inválidos (400).
- Todas as 30 rotas protegidas: ausência de token, assinatura inválida, expiração,
  esquema incorreto, claims inválidos, usuário removido/inativo/cancelado e CLIENT proibido.
  As 17 operações exclusivas de ADMIN também rejeitam ANALYST.
- Perfil atual consultado no banco, mesmo com token antigo; esquema Bearer sem distinção
  de maiúsculas. Rejeições conferem snapshots das sete tabelas de negócio.
- Ajustada somente a fixture para gravar todo o e-mail em maiúsculas, como a API faz.
  A primeira execução identificou essa divergência nos três cenários de login; nenhuma
  alteração de produção ou relaxamento das expectativas foi necessário.

Verificação: **330/330 testes aprovados** nos dois arquivos do lote. Tipos da aplicação
e dos testes, build, lint e Biome dos arquivos alterados passaram. Lote concluído;
commit: `test: cover authentication and route authorization`.

### Lote 2.2 — usuários

- Quatro rotas: lista com defaults/paginação/ordenação estável, leitura por ID, PATCH e
  DELETE com retorno público e persistência conferida. ADMIN e ANALYST consultam; o
  lote 2.1 confere os perfis e a autenticação em cada rota.
- A lista inicial contém o próprio usuário autenticado: uma lista totalmente vazia de
  usuários é incompatível com a autenticação atual. As demais listas admitem vazio.
- IDs malformados (400), IDs válidos ausentes (404), paginação e campos Zod inválidos,
  corpos vazios/desconhecidos e tipos de corpo inválidos. Primitivos JSON são recusados
  pelo parser Express (400); arrays e objetos inválidos são recusados pelo Zod (400).
- Omissão de perfil/status/vínculo/senha preserva o registro. Alteração de senha usa
  bcrypt e autentica com as novas credenciais; nenhuma resposta expõe a senha/hash.
- E-mail duplicado (409), empresa ausente (404), CLIENT sem vínculo (400), mudança conjunta
  de perfil/empresa, promoção com desvinculação e exclusão repetida (404).
- Contratos HTTP comuns extraídos somente em `test/support/route-contracts.ts`, sem
  derivar casos de teste dos schemas da implementação. Rejeições conferem todo o banco.

Verificação: **55/55 testes aprovados**; tipos da aplicação/testes, build, lint e Biome
dos testes passaram. Commit: `test: cover user endpoints and shared request contracts`.

### Lote 2.3 — distribuidoras

- Cinco rotas com contratos de leitura, paginação e IDs; POST/PATCH cobrem campos
  obrigatórios, tipo, null, nome vazio, espaços, tamanho e corpo inválido.
- Criação/alteração normalizam o nome, respeitam os limites de 2/50 caracteres e
  retornam dados persistidos; unicidade normalizada responde 409 em POST e PATCH.
- Exclusão sem vínculos retorna 200 e os dados removidos. Usina, empresa e saldo mensal
  são exercitados separadamente como dependências impeditivas (409).
- Todas as rejeições conferem a preservação das sete tabelas. Sem alterações em produção.

Verificação: **59/59 testes aprovados**; tipos da aplicação/testes, build, lint e Biome
passaram. A primeira execução identificou nomes não normalizados nas fixtures; os nomes
gerados agora seguem as maiúsculas da API. A expectativa de unicidade foi preservada.
Commit: `test: cover distributor endpoints and deletion dependencies`.

### Lote 2.4 — usinas

- Cinco rotas com contratos de lista, paginação, IDs e validação POST/PATCH: campos
  obrigatórios, tipos, null, limites de nome/cidade/capacidade, enums e referências UUID.
- Criação SOLAR/HYDRO/WIND, normalização, capacidade decimal, status ACTIVE por padrão,
  persistência e leitura do registro; referência inexistente (404) e nome repetido (409).
- Atualização completa, troca de distribuidora sem histórico e manutenção da mesma
  distribuidora com histórico. Mudança de distribuidora com geração histórica retorna
  409 sem aplicar nem os outros campos enviados. As regressões de status estão no 2.0.
- Exclusão livre (200), exclusão impedida pela geração (409) e saldos históricos intactos.
  Sem mudanças em produção.

Verificação: **101/101 testes aprovados**; tipos da aplicação/testes, build, lint e Biome
passaram. Commit: `test: cover power plant endpoints and historical ownership`.

### Lote 2.5 — empresas clientes

- Cinco rotas com leitura/paginação/IDs, campos obrigatórios e validações POST/PATCH.
  Percentual cadastral inteiro entre 0/100; tipos, null, frações e limites inválidos são 400.
- CNPJ com/sem máscara, normalização, dois dígitos verificadores e sequências repetidas;
  formato inválido é Zod 400, algoritmo inválido é erro de negócio 400 e duplicidade é 409.
- Referência de distribuidora ausente (404); alteração de todos os campos sem histórico;
  troca de distribuidora com alocações bloqueada (409), sem mudanças parciais.
- Alterar o padrão da empresa não reescreve créditos ou saldos históricos. Exclusão
  livre retorna 200; CLIENT vinculado e alocações impedem exclusão (409). Vínculos
  opcionais de ADMIN/ANALYST são anulados na exclusão permitida da empresa.
- Rejeições preservam as sete tabelas; nenhuma alteração de produção foi necessária.

Verificação: **91/91 testes aprovados**; tipos da aplicação/testes, build, lint e Biome
passaram. Commit: `test: cover client company endpoints and relationship rules`.
