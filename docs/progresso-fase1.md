# Progresso da fase 1

Execução sequencial, um commit por achado. Autorização para seguir sem revisão intermediária
válida somente nesta fase. Parar ao concluí-la; não implementar fases 2 ou 3 sem avaliação.

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
