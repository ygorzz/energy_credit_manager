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
