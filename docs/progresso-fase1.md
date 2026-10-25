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
