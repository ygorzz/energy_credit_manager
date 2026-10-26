# Levantamento de requisitos do MVP

Data: 24/10/2026. Revisão: gestão de métricas energéticas.

Prioridade de execução: primeiro corrigir os erros da API atual e concluir os testes
automatizados de todas as rotas existentes; somente depois implementar estes requisitos.
Consultar o [plano de operação e memória de decisões](plano-operacao.md) e a
[auditoria técnica](auditoria-tecnica.md) antes de retomar a implementação.

## 1. Objetivo e limites desta entrega

Permitir ao administrador gerenciar usinas, distribuidoras e empresas clientes, registrar
dados mensais manualmente e acompanhar métricas em dashboards. Cada empresa cliente terá
acesso somente aos próprios dados de consumo e créditos alocados.

O administrador é um registro de `User` com perfil `ADMIN`. Não haverá entidade ou tabela
`Operadora`. O MVP atende uma única operação, sem cadastro de outras empresas donas do sistema.

Esta revisão é documental. Os requisitos e as correções descritos aqui orientam a futura
implementação; não significam que endpoints, banco ou dashboards já foram alterados.

## 2. Conceitos e decisões confirmadas

- Empresa cliente: cadastro que concentra seus usuários, consumo e alocações mensais.
- Usina: cadastro da instalação geradora, vinculado a uma distribuidora.
- Distribuidora: agrupamento das usinas e empresas utilizado no controle mensal de energia.
- Competência: combinação de mês e ano de um lançamento.
- Geração mensal: energia registrada manualmente para uma usina na competência.
- Crédito alocado: quantidade de energia destinada a uma empresa naquela competência.
- Consumo mensal: energia consumida pela empresa, informada pelo administrador.
- Percentual aplicado: relação entre a quantidade alocada à empresa e a geração total mensal
  da sua distribuidora. Não é calculado sobre a energia ainda disponível.
- Disponibilidade operacional: geração total mensal da distribuidora menos as alocações
  registradas para suas empresas na mesma competência.

Crédito alocado não informa quanto foi efetivamente utilizado para compensar consumo.
Disponibilidade operacional não representa saldo acumulado de créditos do cliente.
Créditos efetivamente utilizados e saldo acumulado não serão calculados neste MVP.

Os lançamentos serão mensais e consolidados por empresa, sem separar matriz, filiais ou
unidades consumidoras. Energia será expressa em MWh, acompanhando a API atual; capacidade
instalada das usinas permanece em MW, que é uma grandeza diferente.

A quantidade alocada será informada manualmente. A porcentagem poderá ser informada; quando
omitida ou enviada como `null`, será utilizado o percentual cadastrado na empresa.
Em ambos os casos, a quantidade precisa corresponder ao percentual aplicado.

## 3. Perfis e permissões

- Administrador (`ADMIN`): gerencia usuários e cadastros, registra dados mensais, realiza
  correções e acompanha o dashboard de toda a operação.
- Cliente (`CLIENT`): consulta somente os dados e o dashboard da empresa vinculada ao usuário.
  Os lançamentos mensais são feitos pelo administrador, sem edição pelo cliente.
- Analista (`ANALYST`): perfil já existente, cujas permissões atuais são preservadas como base.
  A criação de alocações já permite `ADMIN` e `ANALYST`; esta revisão não amplia suas
  permissões nem cria um dashboard específico para esse perfil.

O acesso do cliente é criado e vinculado à empresa pelo administrador. Não haverá cadastro
público ou acesso de distribuidoras. Filtros e IDs recebidos do cliente não podem permitir
consulta de dados de outra empresa.

## 4. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF01 | Autenticar usuários e restringir ações por perfil e empresa vinculada. |
| RF02 | Administrador gerencia usuários, seus perfis, vínculos e situações de acesso. |
| RF03 | Gerenciar distribuidoras e seus vínculos com usinas e empresas clientes. |
| RF04 | Gerenciar usinas com nome, localização, fonte, capacidade, distribuidora e situação. |
| RF05 | Gerenciar empresas com nome, CNPJ, distribuidora e percentual de alocação padrão. |
| RF06 | Registrar manualmente geração mensal por usina, incluindo geração igual a zero. |
| RF07 | Registrar uma alocação mensal por empresa, validando quantidade e percentual. |
| RF08 | Registrar manualmente o consumo mensal consolidado de cada empresa. |
| RF09 | Permitir corrigir lançamentos e manter os saldos operacionais consistentes. |
| RF10 | Consultar históricos e filtrar dados por período e cadastros aplicáveis ao perfil. |
| RF11 | Exibir dashboard administrativo com os indicadores definidos na seção 6. |
| RF12 | Exibir dashboard do cliente com os indicadores da própria empresa definidos na seção 6. |

Os registros de geração, alocação e consumo são independentes: o administrador pode lançar
consumo antes da alocação ou vice-versa. O dashboard deve identificar o que ainda falta.
Não haverá etapas de aprovação, envio à distribuidora ou confirmação de compensação no MVP.

## 5. Regras de negócio e cálculos

### Competências, cadastros e quantidades

- Geração é única por usina, mês e ano; alocação e consumo são únicos por empresa, mês e ano.
- Lançamentos admitem zero, mas não valores negativos. Ausência de registro não equivale a zero.
- O administrador informa a geração por usina; o sistema consolida os valores por distribuidora.
- A alocação utiliza somente o saldo da distribuidora da empresa naquela competência.
- O total alocado não pode exceder a geração mensal consolidada, inclusive sob concorrência.
- Correções de quantidade, competência ou destino devem ajustar todos os saldos afetados.
- Não permitir reduzir ou excluir geração se isso deixar o total gerado abaixo do já alocado.
- Cadastros com histórico não podem ser excluídos nem ter vínculos alterados de forma que
  reatribuam silenciosamente lançamentos anteriores.
- Alterar o percentual padrão da empresa não modifica percentuais de alocações já registradas.

### Percentual aplicado

O cálculo de referência é:

```text
percentual calculado = quantidade alocada / geração total mensal da distribuidora × 100
```

Na criação, utilizar o percentual informado ou, na sua ausência (`null` ou campo omitido),
o percentual cadastrado na empresa. O percentual aplicado deve estar entre 0% e 100%.
Comparar esse percentual e o percentual calculado arredondados a duas casas decimais,
com arredondamento convencional (metade para cima) e aritmética decimal.
Arredondar a porcentagem não deve alterar a quantidade de energia informada.

Exemplo: uma alocação de 1 MWh sobre 3 MWh gerados corresponde a aproximadamente 33,33%.
Esse percentual deve ser aceito, sem exigir que o usuário informe uma dízima periódica.

Sem geração mensal positiva, rejeitar a criação com mensagem explícita de ausência
de geração positiva para alocar. Isso inclui saldo existente cuja geração total seja zero.

### Disponibilidade operacional e consumo

```text
total gerado = soma da geração das usinas da distribuidora na competência
total alocado = soma das alocações das empresas da distribuidora na competência
disponibilidade operacional = total gerado − total alocado
diferença entre consumo e alocação = consumo informado − créditos alocados
```

A diferença pode ser negativa se a alocação superar o consumo. É apenas uma comparação
entre volumes; não será rotulada como saldo de créditos ou compensação efetiva.
Só apresentar essa diferença quando os dois lançamentos estiverem disponíveis.

## 6. Dashboards e consultas

### Dashboard administrativo

- Geração total e detalhamento por usina e distribuidora.
- Total de créditos alocados e detalhamento por empresa e distribuidora.
- Disponibilidade operacional por distribuidora e consolidada para o período filtrado.
- Consumo informado pelas empresas, com detalhamento por empresa e distribuidora.
- Comparação mensal e histórico de geração, alocação e consumo.
- Identificação dos lançamentos mensais ainda não informados.

Filtros: período (mês/ano ou intervalo), distribuidora, usina para geração e empresa para
consumo/alocação. Não atribuir alocações a uma usina específica: o modelo atual registra
o rateio sobre o total da distribuidora.

### Dashboard do cliente

- Consumo mensal consolidado da própria empresa.
- Créditos alocados e percentual aplicado em cada competência.
- Comparação entre consumo e alocação quando ambos estiverem informados.
- Histórico e comparação entre meses, com filtro por período.

Não exibir saldo operacional de toda a distribuidora ou dados de outras empresas.
Não exibir economia financeira, créditos utilizados ou saldo acumulado.

### Ausência de dados e comparações

Meses sem lançamento aparecem como **dados não informados**; zero só aparece quando existe
registro com valor zero. Totais parciais devem ser identificados como soma dos dados informados,
indicando quantas empresas ou usinas têm lançamentos no período filtrado.
Uma visão consolidada só representa o total completo quando todos os lançamentos necessários
estiverem presentes.

Comparações percentuais com mês anterior só são apresentadas quando há dados nos dois meses
e o valor anterior é positivo. Caso contrário, indicar **sem base para comparação percentual**,
mantendo os valores absolutos disponíveis. Históricos respeitam os vínculos de cada período.

## 7. Fluxo principal do MVP

1. Administrador cadastra distribuidoras, usinas, empresas e usuários.
2. Administrador informa a geração mensal de cada usina.
3. Sistema atualiza o consolidado mensal e a disponibilidade de cada distribuidora.
4. Administrador informa empresa, competência, quantidade alocada e, opcionalmente, percentual.
5. Sistema resolve o percentual, valida e grava alocação e saldo conjuntamente.
6. Administrador informa o consumo mensal consolidado da empresa.
7. Dashboards exibem os dados disponíveis, os históricos e os lançamentos faltantes.
8. Quando necessário, administrador corrige lançamentos e o sistema ajusta os saldos afetados.

## 8. Estrutura existente e correções necessárias

### Aproveitamento da implementação atual

| Área | Situação e encaminhamento |
| --- | --- |
| Auth / Users | Reaproveitar autenticação e perfis; incluir consultas do cliente isoladas por empresa. |
| Distributors / Power-Plants | Reaproveitar cadastros e vínculos de distribuidora. |
| Client-Companies | Preservar cadastro e percentual padrão usado quando não houver percentual informado. |
| Monthly-Generations | Reaproveitar geração mensal por usina em MWh. |
| Credit-Allocations | Preservar alocação por empresa/mês, com quantidade manual e base na distribuidora. |
| MonthlyDistributorBalance | Reaproveitar geração, alocação e disponibilidade operacional mensais. |
| Consumo mensal | Ainda não existe no schema inspecionado; incluir na implementação futura. |
| Dashboards | Implementar consultas agregadas, filtros por período e visualizações por perfil. |

Não criar tabelas de operadora, contrato, adesão, cobrança ou unidade consumidora para este MVP.

### Fluxo atual de `POST /credit-allocations`

1. A rota aplica autenticação e permite criação por `ADMIN` ou `ANALYST`.
2. O controller valida o corpo da requisição e chama o serviço.
3. O serviço busca empresa e saldo mensal da sua distribuidora.
4. Verifica disponibilidade e correspondência entre quantidade e porcentagem.
5. Cria a alocação e incrementa o total alocado, decrementando a disponibilidade.
6. As operações de banco usam a mesma transação com isolamento `Serializable`.
7. Duplicidade e conflito de concorrência são tratados como conflito; sucesso retorna HTTP 201.

### Correções a implementar posteriormente

- DTO de criação: aceitar `percentageApplied` omitido ou `null`, além do número explícito.
- Serviço de criação: resolver o percentual efetivo antes da validação e comparar esse valor,
  em vez de comparar diretamente o campo original da requisição.
- Comparação: arredondar ambos os percentuais a duas casas decimais, conforme a seção 5.
- Geração zero: verificar geração positiva antes de dividir e retornar erro explícito (HTTP 400).
- Consistência: preservar a transação que grava alocação e atualiza saldo conjuntamente.
- Alterações de alocação devem respeitar a mesma correspondência entre quantidade e percentual.

### Evidência da revisão anterior

Foram exercitados oito cenários do serviço em memória: quantidade e percentual compatíveis,
percentual `null`, percentual incompatível, disponibilidade insuficiente, empresa inexistente,
saldo mensal inexistente, geração e alocação iguais a zero e percentual decimal arredondado.
Também foram verificadas três entradas no DTO: campo omitido, `null` e número.

O fluxo com quantidade e percentual compatíveis passou. O DTO rejeitou o campo omitido;
o serviço rejeitou `null` mesmo com percentual padrão correspondente e também rejeitou
33,33% para a relação de 1 MWh sobre 3 MWh. As correções acima continuam pendentes.

Essa execução utilizou repositórios simulados e não acessou o banco. Não comprova persistência,
rollback real ou comportamento sob concorrência no PostgreSQL.

## 9. Requisitos não funcionais e critérios de aceite

### Requisitos não funcionais

- Proteger senhas com hash, manter segredos fora do repositório e usar HTTPS em produção.
- Impedir acesso entre empresas em listagens, detalhes e consultas dos dashboards.
- Garantir atualização atômica dos saldos, sem duplicidade ou disponibilidade negativa.
- Exibir interface em português, competência e unidade explícitas, erros claros e paginação.
- Registrar erros sem expor credenciais e manter backup diário com restauração validada no piloto.

### Cenários de aceite da implementação futura

| Cenário | Resultado esperado |
| --- | --- |
| Ciclo mensal completo | Geração, alocação e consumo aparecem nos dashboards correspondentes. |
| Percentual padrão | Omitir ou enviar `null` usa o cadastro da empresa e valida a quantidade. |
| Percentual explícito | Compatível é aceito; incompatível retorna erro sem alterar alocação ou saldo. |
| Arredondamento | 1 MWh de 3 MWh e percentual de 33,33% são aceitos. |
| Geração inexistente ou zero | Rejeitar alocação com mensagem clara; não dividir por zero. |
| Disponibilidade insuficiente | Com 100 MWh gerados e 90 alocados, rejeitar nova alocação de 20 MWh. |
| Duplicidade | Segundo registro por empresa/competência não duplica alocação ou consumo. |
| Correção de alocação | Alterar quantidade, competência ou empresa ajusta os saldos afetados. |
| Exclusão de alocação | Quantidade retorna à disponibilidade da distribuidora na competência original. |
| Correção de geração | Rejeitar redução ou exclusão incompatível com alocações existentes. |
| Concorrência e rollback | Operações simultâneas e falhas não geram excesso alocado ou gravação parcial. |
| Isolamento | Cliente A não acessa dados do cliente B ao alterar IDs ou filtros. |
| Histórico | Alterar percentual padrão não reescreve alocações de meses anteriores. |
| Dados ausentes e zero | Distinguir zero de mês não informado; identificar total incompleto. |
| Consumo menor que alocação | Exibir diferença negativa sem tratá-la como crédito acumulado. |

Na implementação futura, executar verificações de tipo, lint, formatação e build do repositório.
Verificar endpoints afetados, autorização, validação e saldos após criar, alterar e excluir
lançamentos. A validação de persistência e concorrência exige banco de testes.

## 10. Ordem de implementação e itens fora do MVP

Ordem de implementação futura:

1. Corrigir validação de alocações e revisar consistência das alterações de saldo.
2. Adicionar consumo mensal por empresa e consultas históricas por período.
3. Implementar agregações e isolamento de dados para os dashboards.
4. Construir dashboards administrativo e do cliente e validar o ciclo mensal do piloto.

Fora do escopo:

- Entidade `Operadora`, múltiplas operações independentes e assinaturas do software.
- Contratos, adesões, cláusulas comerciais e aprovações de rateio.
- Descontos comerciais, cobranças e quaisquer valores ou indicadores financeiros.
- Cadastro e lançamentos separados por unidade consumidora, matriz ou filial.
- Créditos efetivamente utilizados, saldo acumulado do cliente e expiração de créditos.
- Conferência de faturas e confirmação de compensação pela distribuidora.
- Rateio com rastreamento da usina de origem para cada empresa.
- Integrações automáticas com distribuidoras, medidores ou inversores.
- Geração diária, monitoramento em tempo real e lançamentos diários.
- Cálculo tarifário, emissão de documentos financeiros e previsão ou otimização automática.

A evolução para dados diários será tratada posteriormente. Este MVP não exige migração
antecipada dos lançamentos mensais para uma estrutura diária.

## 11. Implementações futuras priorizadas

### EF01 — Transferência de usina com histórico entre distribuidoras

Registrado em 25/10/2026 por solicitação do responsável. Prioridade alta.

Disponibilizar ao administrador um fluxo próprio para transferir uma usina que já possui
gerações registradas para outra distribuidora, preservando a integridade dos históricos,
das alocações existentes e dos saldos operacionais de origem e destino.

A F02 mantém o bloqueio dessa troca pelo PATCH cadastral enquanto o fluxo dedicado não
for implementado. Esse bloqueio é a proteção atual, não a solução definitiva de transferência.

Antes da implementação, definir:

- A competência de vigência e se o fluxo atenderá mudança futura, correção retroativa ou ambas.
- Como representar o vínculo da usina em cada período, sem reatribuir silenciosamente o histórico.
- O tratamento de gerações e alocações já existentes, inclusive quando a mudança afetar
  disponibilidade ou a base dos percentuais. Não presumir recálculo automático de percentuais.

O fluxo deve apresentar os impactos antes da confirmação, registrar responsável, origem,
destino e vigência, e aplicar conjuntamente os ajustes necessários. Deve impedir disponibilidade
negativa e alterações parciais, inclusive sob concorrência. Consultas e correções/exclusões
posteriores de geração precisam respeitar a distribuidora correspondente ao período.

O aceite deverá cobrir transferência com histórico, períodos anteriores e posteriores à
vigência, alocações existentes, falta de disponibilidade, correções após transferência,
concorrência e rollback. Os resultados esperados dependerão das regras de vigência aprovadas.

Esta é uma implementação futura a detalhar após a fase 2, sem alterar a sequência atual
de revisão das correções, testes das rotas existentes e implementação dos requisitos.
