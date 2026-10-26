# Progresso da fase 1

Execução sequencial, um commit por achado. Autorização para seguir sem revisão intermediária
válida somente nesta fase. Parar ao concluí-la; não implementar fases 2 ou 3 sem avaliação.

Estado de entrega: F01–F21 implementados e commitados; aguardando revisão do responsável.

F01: concluído pelo responsável em `0456a14`.
F16: concluído pelo responsável em `e1df062`.

Verificações desta fase são diagnósticos pontuais, sem criar a suíte permanente da fase 2.
O banco atual não deve ser usado para dados destrutivos de verificação.

## Correções

Os registros abaixo documentam cada achado conforme sua implementação.

### F02 — bloqueio da troca de distribuidora da usina

Consulta da usina, verificação do histórico e atualização na mesma transação Serializable.
Troca com geração existente retorna 409; mesmo vínculo e alterações de outros campos continuam
permitidos. O repositório aceita o cliente da transação. Conflitos concorrentes retornam 409.
Verificados cinco cenários em memória e a checagem de tipos. Proteção concorrente integrada
com os lançamentos energéticos será exercitada após F04, que fecha as transações da geração.

### F03 — bloqueio da troca de distribuidora da empresa

Transação Serializable verifica o cadastro e suas alocações antes de permitir a troca.
Histórico existente bloqueia a mudança com 409; mesmo vínculo e outros campos continuam
permitidos. Cinco cenários em memória e checagem de tipos passaram. Não há transferência
retroativa de saldos ou reatribuição de alocações antigas.

### F04 — transações completas e conflitos concorrentes

Leituras, validações e gravações de geração agora usam a mesma transação Serializable.
O repositório recebe `tx` também na leitura; falhas de serialização do Prisma e o conflito
estruturado `TransactionWriteConflict` do driver são reconhecidos sem mascarar outros erros.
Quatro pares concorrentes reais passaram no PostgreSQL 18 descartável: duas correções de
geração, exclusão versus alocação, troca de distribuidora da usina versus geração e troca
da empresa versus alocação. Conferidas as somas de geração/alocação e disponibilidade,
incluindo movimento de competência e os bloqueios F02/F03. Checagem de tipos passou.
O replay completo das 14 migrações também passou no banco vazio isolado.

### F13 — precisão dos ajustes de energia

Removidas conversões `Number` dos deltas e decrementos de geração. Alteração de 10 para
`1e-16`, movimento para outro mês com `2e-16` e exclusão passaram no PostgreSQL isolado,
sempre conferindo somas e disponibilidade exatas. Tipos e Biome passaram. Lote 1.2 encerrado.

### F05 — consistência do percentual no PATCH de alocação

POST e PATCH compartilham a mesma verificação numérica. O PATCH valida os valores efetivos,
inclusive mudança de empresa/competência. Rejeições de alterações parciais incompatíveis,
atualização válida e mudança para empresa com base distinta passaram no PostgreSQL isolado,
com conferência dos saldos. Tipos e Biome passaram.

### F06 — percentual opcional e padrão cadastrado

O DTO aceita omissão e null, e a criação valida o percentual já resolvido a partir do
cadastro. Verificados os três caminhos (omitido, null e explícito) no PostgreSQL isolado,
conferindo a gravação do percentual e os saldos. Checagem de tipos passou.

### F07 — comparação decimal e arredondamento

Comparação usa Decimal com duas casas e ROUND_HALF_UP. POST/PATCH de 1/3 e 2/3,
rejeição de percentual divergente e a fronteira de 0,005% passaram no PostgreSQL isolado.
A quantidade informada não é arredondada para forçar correspondência. Tipos passaram.

### F08 — base de geração positiva

Criação sem geração ou com total zero retorna 400 com mensagem explícita, antes de dividir
ou validar disponibilidade. O PATCH também exige base positiva. Verificadas quantidades zero
e positiva sobre bases ausentes/zero, além de alocação zero válida sobre base positiva,
no PostgreSQL isolado. Tipos passaram. Mudança de contrato: ausência de geração no POST
passa de 404 para 400; referências de empresa e outros recursos continuam com seu tratamento.

### F09 — limites do percentual padrão

POST/PATCH da empresa exigem percentual padrão inteiro entre 0 e 100, coerente com o banco.
Verificados 0/1/100 válidos e negativos, frações, acima de 100 e não finitos inválidos nos
dois DTOs. Tipos passaram. Nenhuma alteração de schema; percentual explícito de alocação
continua decimal. Lote 1.3 encerrado.

### F10 — vínculo obrigatório e consistente do usuário cliente

CLIENT exige UUID de empresa existente na criação e no estado efetivo do PATCH. Cadastro,
atualização e exclusão de empresa usam transações Serializable, e a exclusão bloqueia
empresas com clientes vinculados. As rotas injetam os repositórios explicitamente.
O DTO de PATCH não reaplica defaults de role/status: alterar só nome preserva o ADMIN.
Cadastro válido/inválido, troca parcial de perfil, remoção de vínculo, exclusão e concorrência
foram exercitados no PostgreSQL isolado; nenhum CLIENT órfão. Tipos e Biome passaram.

### F11 — retorno da atualização de geração

O caminho de alteração de quantidade na mesma competência retorna o registro atualizado.
Verificados mudança de quantidade, atualização sem delta e movimento de mês no PostgreSQL
isolado; todos retornaram o registro e preservaram os saldos. Tipos passaram.

### F12 — status HTTP da geração

PATCH e DELETE respondem 200 com o corpo existente; POST permanece 201. Os três métodos
foram exercitados por HTTP com autenticação e PostgreSQL isolado, conferindo também o
registro atualizado e os saldos. Tipos passaram.

### F14 — erros esperados de persistência

Por decisão do responsável na revisão de 25/10/2026, os erros são tratados diretamente
nos `catch` dos serviços de distribuidoras, usinas, empresas, usuários e registro de usuário.
O helper compartilhado `rethrowPersistenceError` foi removido. Unicidade (`P2002`) retorna
409; registro ausente em alteração/exclusão (`P2025`) retorna 404; referência inexistente
em criação/alteração (`P2003`) retorna 404; exclusão impedida por vínculos (`P2003`) retorna
409. Cada operação trata os códigos pertinentes ao schema e às consultas que executa,
com mensagens específicas por entidade. Usuários não possuem dependentes que impeçam
exclusão no schema atual; distribuidoras não recebem referências externas na criação.
Conflitos transacionais continuam 409, reconhecidos por `isTransactionConflict`.
Erros de negócio e falhas desconhecidas são relançados sem substituição.

A implementação inicial foi exercitada com violações reais no PostgreSQL isolado.
A revisão sem helper passou em 133 cenários de diagnóstico em memória, cobrindo as
12 operações alteradas, status/mensagens pelo handler HTTP, ambos os formatos de conflito,
retornos de sucesso e preservação de erros. Esses cenários não acessaram o banco e não
substituem a suíte permanente da fase 2. Tipos, build, lint, formatação e Biome passaram.

### F15 — erros do parser e logs

Mapeamento limitado aos tipos/status conhecidos de body-parser mantém 400 para JSON inválido,
413 para corpo excessivo e 415 para encoding/charset não suportado. Erros desconhecidos
continuam 500. Logs não incluem corpo, mensagem bruta, credenciais ou query string; respostas
já iniciadas são encaminhadas ao Express. Quatro casos HTTP reais e erro com status arbitrário
passaram, com verificação de sentinela sensível ausente dos logs. Tipos passaram.

### F17 — ordenação da paginação

Os sete repositórios de listagem ordenam por ID crescente antes de aplicar skip/take.
Páginas consecutivas e leituras repetidas foram comparadas à ordem global no PostgreSQL
isolado; todos passaram, assim como os tipos. Paginação por offset ainda pode se deslocar
com inserções/exclusões concorrentes. Lote 1.4 encerrado.

### F18 — capitalização dos caminhos

Import do app e diretório local alinhados ao caminho `src/modules/auth` já registrado no Git.
Os 168 imports relativos próprios correspondem exatamente aos caminhos versionados.
Tipos e build passaram no Windows. Docker Linux está indisponível; Ubuntu/WSL está instalado,
mas não disponibiliza Node Linux no PATH. A execução completa em Linux permanece como
verificação de ambiente da fase 2; a divergência concreta de capitalização foi corrigida.

### F19 — defaults reproduzíveis por migração

Migração nova adiciona default zero aos dois totais de MonthlyDistributorBalance, sem
reescrever o histórico. Aplicação incremental no banco isolado e replay das 15 migrações
em outro banco vazio do mesmo cluster passaram. Ambos terminaram sem diferenças em relação
ao schema Prisma; defaults conferidos no catálogo e prisma validate passou. O banco da
aplicação não foi acessado nem migrado; a migração acompanha o código para aplicação posterior.

### F20 — bootstrap administrativo configurável e repetível

Removidas credenciais fixas. `.env.example` documenta as variáveis BOOTSTRAP_ADMIN_*;
email/senha são explícitos, e a criação segue a validação do cadastro. O seed usa conexão
própria com encerramento garantido e não exige JWT_SECRET. Reexecução preserva senha,
perfil e status; colisão com outro perfil falha sem promovê-lo. Upsert vazio evita sobrescrita
também na disputa pela criação. Falhas não registram valores sensíveis.
Verificados criação, hash, reexecução com senha diferente/ausente, preservação de INACTIVE,
configuração ausente e colisão com CLIENT no PostgreSQL isolado. A CLI Prisma passou duas
vezes com PATH equivalente ao npx. Tipos da aplicação e do seed e Biome passaram.

### F21 — formatação, imports e orientações

Normalizados os arquivos próprios com Biome, sem mudança das regras de negócio. Código
gerado e o diretório de diagnóstico descartável ficam fora dessa ferramenta. Orientação
de bootstrap no AGENTS alinhada ao seed configurável, e acesso a DATABASE_URL padronizado.
Passaram check, build, lint, format:check e biome:check, sem diagnósticos. O Biome verificou
63 arquivos próprios/configurações e o lint verificou 55 arquivos de src.
Após a normalização, 24 requisições HTTP reais passaram com autenticação, bloqueios de
vínculo, POST/PATCH/DELETE energéticos, percentuais padrão/null/decimal, rejeições e parsing;
as somas e disponibilidades do banco isolado permaneceram consistentes. Lote 1.5 encerrado.

## Commits para revisão

| Lote | Achado | Commit |
| --- | --- | --- |
| 1.1 | F01 | `0456a14` |
| 1.1 | F16 | `e1df062` |
| 1.2 | F02 | `e95c73a` |
| 1.2 | F03 | `72b1484` |
| 1.2 | F04 | `b483aaa` |
| 1.2 | F13 | `4f07a34` |
| 1.3 | F05 | `2b31e1f` |
| 1.3 | F06 | `b1fb85d` |
| 1.3 | F07 | `43ff1f6` |
| 1.3 | F08 | `4963d80` |
| 1.3 | F09 | `eeba794` |
| 1.4 | F10 | `39e33c1` |
| 1.4 | F11 | `f5cf64d` |
| 1.4 | F12 | `273aa17` |
| 1.4 | F14 | `0d019c0` |
| 1.4 | F15 | `912adb1` |
| 1.4 | F17 | `7174091` |
| 1.5 | F18 | `8fa914e` |
| 1.5 | F19 | `3ed5015` |
| 1.5 | F20 | `9978e82` |
| 1.5 | F21 | `85fcbda` |

## Limites e passagem de fase

- Verificações com banco usaram exclusivamente PostgreSQL 18 descartável em loopback,
  porta 55439, com bancos `phase1` e `phase1_replay`. O cluster foi encerrado ao final.
- Não houve acesso ou migração do banco configurado para a aplicação. A migração F19
  está versionada, mas sua aplicação nesse ambiente ainda precisa ser realizada.
- A execução Linux completa não foi possível no runtime disponível. Imports próprios
  foram comparados com o Git, e tipos/build passaram no Windows. Validar Linux na fase 2.
- R01/R02 exigem conhecer migrações aplicadas e dados existentes antes de qualquer reparo.
  O replay vazio não demonstra segurança de upgrades históricos com tabelas populadas.
- D01 permanece para decisão de produto: alterações de geração preservam os percentuais
  históricos gravados, como antes; não houve recálculo silencioso. Quantidades e saldos
  são ajustados transacionalmente. D02/D03 também não receberam regras novas.
- Nenhuma suíte permanente, dashboard, consumo ou acesso novo de cliente foi implementado.
  Os requisitos aprovados continuam preservados em `requisitos-mvp.md`.

Próxima ação: revisão e avaliação do código pelo responsável. Aguardar autorização antes
de iniciar a fase 2. Os diagnósticos desta fase não representam cobertura automatizada de
todas as 31 rotas.

## Ajustes de revisão — comentários (25/10/2026)

Por solicitação do responsável, comentários dos blocos mantidos foram restaurados após a
reorganização da geração e da autenticação. Acrescentadas explicações breves, em inglês, às principais
regras e correções da fase 1, incluindo vínculos históricos, transações, precisão, percentuais,
usuários, erros, ordenação e bootstrap. A orientação de preservação e comentários curtos
para implementações futuras está registrada no AGENTS e na memória do plano de operação.
Alterações restritas a comentários e documentação; nenhuma regra executável mudou.
Tipos, build, lint, format:check e biome:check passaram. A fase 2 continua aguardando aceite.

Em 25/10/2026, o responsável autorizou incorporar os comentários em inglês aos commits dos
respectivos achados. Os 23 commits da sequência foram reconstruídos preservando autoria,
mensagens e código executável; os hashes da tabela de revisão foram atualizados.
O histórico anterior está preservado em `codex/phase1-before-comments-20261025`.
Consultar [mapa-commits-fase1.md](mapa-commits-fase1.md) para a correspondência entre hashes.
O remoto não foi atualizado. As demais alterações documentais em revisão permanecem separadas.
