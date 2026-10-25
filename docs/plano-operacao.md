# Plano de operação e memória de decisões

Data: 24/10/2026. Prioridade definida pelo responsável pelo projeto.

## 1. Ordem obrigatória de trabalho

1. Auditar a implementação existente e registrar inconsistências.
2. Corrigir os erros da API atual, preservando as regras de negócio já confirmadas.
3. Implementar e executar testes automatizados para todas as rotas existentes.
4. Somente depois implementar os novos requisitos do MVP.

Não iniciar consumo mensal, dashboards, novos filtros ou endpoints do cliente enquanto
as correções e a suíte da API existente não estiverem concluídas.
Reproduções pontuais durante a auditoria/correção são verificações de diagnóstico;
a suíte completa e permanente pertence à fase 2 abaixo.

Estado atual: F01–F21 implementados e commitados, encerrando os lotes 1.1–1.5.
F01/F16 foram commitados pelo responsável; as outras 19 correções têm commits individuais.
Verificações e limitações estão em [progresso-fase1.md](progresso-fase1.md).
Aguardar revisão e aceite do responsável. Não iniciar testes permanentes da fase 2 ou
requisitos da fase 3 sem nova autorização após essa avaliação.

## 2. Memória das decisões de produto

Fonte de requisitos: [requisitos-mvp.md](requisitos-mvp.md). Documento preservado para a fase 3.
Fonte de problemas atuais: [auditoria-tecnica.md](auditoria-tecnica.md).

- O administrador é `User` com perfil `ADMIN`; não criar entidade ou tabela `Operadora`.
- Uma única operação gerencia suas usinas e empresas clientes.
- O MVP será de métricas energéticas, com lançamentos mensais manuais e energia em MWh.
- A geração é registrada por usina e consolidada por distribuidora.
- Alocação e consumo são consolidados por empresa, sem separar matriz, filiais ou UCs.
- Quantidade alocada é informada manualmente. Percentual explícito é opcional; omissão ou
  `null` usa o percentual padrão da empresa. A quantidade deve corresponder a esse percentual.
- A base do percentual é a geração total mensal da distribuidora, e não o saldo disponível.
- Comparar percentuais com duas casas decimais, sem arredondar a energia para forçar igualdade.
- Cliente poderá consultar somente sua empresa quando o acesso específico for implementado.
- Fora do MVP: contratos, adesões, descontos, cobranças, valores financeiros, créditos
  utilizados e saldo acumulado do cliente. Operação diária é evolução posterior.
- Preservar a matriz atual de ADMIN/ANALYST/CLIENT durante as correções; não liberar rotas
  ao CLIENT como atalho para implementar o produto futuro.

Esta é memória persistida no repositório. Novas sessões devem ler este plano e os documentos
referenciados antes de retomar tarefas; não depender somente do histórico do chat.

## 3. Fase 0 — Auditoria da base existente

Concluída nesta entrega:

- Leitura dos 51 arquivos próprios de `src/`, dos 7 módulos e das 31 rotas.
- Revisão de schema, 14 migrações, seed, configurações e metadados das dependências.
- Inventário de acesso de cada rota e 21 achados priorizados, com evidências e limites.
- Reproduções em memória e HTTP local com repositórios simulados.
- Linha de base: tipos, lint, build e schema passaram; formatação tem 55 diagnósticos.

Não concluído nem presumido: testes reais de concorrência, replay/upgrade do banco,
verificação dos dados existentes e execução Linux. Essas verificações entram nos lotes
correspondentes e na fase 2, sem usar o banco atual como ambiente de teste destrutivo.

## 4. Fase 1 — Corrigir os erros atuais

Trabalhar em lotes pequenos, mantendo os IDs da auditoria e registrando o que foi corrigido,
a verificação realizada e o que ainda depende de banco real. Esta fase não é uma reescrita.

### Execução sequencial e commits — autorização exclusiva da fase 1

Executar lote por lote, na ordem da tabela abaixo, e dentro de cada lote executar um achado
por vez, na ordem em que os IDs aparecem. Não iniciar o próximo achado ou lote antes de
implementar, verificar e commitar o achado atual.

Para cada achado:

1. Implementar somente a correção correspondente e executar as verificações pertinentes.
2. Registrar as alterações e as verificações no acompanhamento da fase.
3. Fazer um commit focado, com mensagem em inglês, contendo a correção daquele achado.
4. Registrar o status **concluído e commitado** e prosseguir sem pedir revisão intermediária.
5. Após todos os achados do lote, seguir para o lote seguinte.
6. Ao finalizar a fase 1, apresentar commits, verificações e limitações e solicitar a revisão
   e avaliação do responsável. Não iniciar a fase 2, a fase 3 ou qualquer requisito novo.

Esta autorização substitui a pausa por achado apenas durante a fase 1. Não concede aprovação
antecipada para fases posteriores. Verificações pontuais das correções não constituem a
implementação da suíte permanente, que continua reservada à fase 2.

Não agrupar achados em um único commit por conveniência. Registrar dependências e resolver
as escolhas de implementação conservando o comportamento confirmado. Decisões que mudem
o produto exigem esclarecimento; não constituem mera revisão de código. Alterações não relacionadas não entram
automaticamente no commit do achado.

| Lote | Achados | Resultado esperado |
| --- | --- | --- |
| 1.1 — Acesso | F01, F16 | Validar Bearer e claims; usuário existente/ativo e perfil atual em cada requisição. |
| 1.2 — Saldos | F02, F03, F04, F13 | Impedir trocas de distribuidora com histórico, fechar janelas concorrentes e manter Decimal nos ajustes. |
| 1.3 — Alocações | F05, F06, F07, F08, F09 | Unificar validação no POST/PATCH, corrigir padrão, arredondamento, geração zero e limites do cadastro. |
| 1.4 — Contratos da API | F10, F11, F12, F14, F15, F17 | Validar vínculos e referências, devolver registros e status corretos, normalizar erros e ordenar páginas. |
| 1.5 — Reprodutibilidade | F18, F19, F20, F21 | Uniformizar caminhos, alinhar migrações/defaults, tornar seed seguro/repetível e normalizar formatação. |

Regras para os lotes:

- Preservar quantidade manual e alocação por distribuidora/empresa/competência.
- Em criação de alocação, omissão/null usa padrão da empresa. No PATCH, omissão preserva
  o percentual da alocação; `null` solicita o padrão atual da empresa, como no código atual.
  Validar o conjunto efetivo após aplicar as alterações, inclusive empresa e competência.
- Manter o padrão cadastral inteiro entre 0 e 100, coerente com `Int`; percentuais explícitos
  de alocação continuam decimais. Não adicionar migração para padrão fracionário sem necessidade.
- Toda operação que altera disponibilidade ou seus vínculos precisa participar da mesma
  estratégia de concorrência; apenas colocar parte das gravações em transação não basta.
- Nunca fazer reparo automático de dados sem antes identificar divergências. Verificar
  totais gerados/alocados e comparar ao saldo por distribuidora e competência.
- Preservar migrações já aplicadas; correções de schema entram em migrações novas e revisáveis.
- Resolver D01 antes de alterar a regra sobre mudança de geração após alocações. Não recalcular
  percentuais históricos silenciosamente. R01/R02 exigem conhecer o histórico de aplicação e dados.
- Manter formatação em alteração separada das correções lógicas para facilitar revisão.

Aceite da fase: todos os F01–F21 resolvidos ou, para dependência externa específica, explicitamente
avaliados com o responsável; verificações apropriadas concluídas e sem divergências de saldo
nos cenários exercitados. Não considerar risco pendente como corrigido apenas por leitura de código.

## 5. Fase 2 — Testes automatizados de todas as rotas existentes

### Ferramentas e isolamento

- Usar `node:test`, `node:assert/strict` e `tsx`, aproveitando o runtime e a dependência existentes.
- Testes HTTP usam a aplicação Express em porta local efêmera e `fetch`, com encerramento
  garantido do servidor e das conexões. Não importar `server.ts` para não fixar a porta 3000.
- Criar comandos `test` para a suíte e `test:integration` para os casos com PostgreSQL.
  A organização fica em `test/unit/` e `test/integration/`; `test/e2e/` vazio pode ser usado
  para fluxos completos sem confundir fixtures com código de produção.
- Testes de integração usam `TEST_DATABASE_URL` separado. Recusar ausência de configuração
  ou destino igual ao banco da aplicação; confirmar destino isolado antes de limpeza/migrações.
- Aplicar as migrações em banco de testes vazio, criar fixtures explícitas por execução
  e limpar somente os dados/ambiente de testes. Não executar seed administrativo do usuário.
- Não substituir PostgreSQL por SQLite nem considerar mocks prova de transação/concorrência.
- Fazer testes em sequência quando compartilharem banco/limitadores; isolar cenários de 429
  por processo ou janela para evitar falsos resultados por contadores compartilhados.

### Cobertura mínima por rota

Usar a matriz de 31 rotas da auditoria como checklist. Cada método/caminho precisa ter
cenário de sucesso e de falha pertinentes; execução de uma única rota não cobre o módulo.

| Grupo | Cenários obrigatórios |
| --- | --- |
| Login e registro | Credenciais corretas/incorretas, situação inativa, e-mail repetido, empresa inválida e perfil proibido. |
| Todas as protegidas | Token ausente/inválido/expirado, esquema incorreto, usuário removido/inativo e perfis permitidos/proibidos. |
| GET de listas | Lista vazia/preenchida, paginação, limites inválidos e ordenação estável. |
| GET por ID | Registro existente, UUID inválido e UUID válido inexistente. |
| POST/PATCH cadastrais | Dados válidos, campos inválidos, unicidade, referências e bloqueios de vínculo com histórico. |
| DELETE cadastrais | Exclusão permitida, registro inexistente e dependência impeditiva com erro de domínio. |
| Geração | Criar, alterar quantidade, trocar mês/ano/usina, excluir e conferir os saldos de origem/destino. |
| Alocação | Número explícito, omitido/null, incompatibilidade, arredondamento, zero, duplicidade e falta de saldo. |
| PATCH/DELETE alocação | Trocas de destino/competência, devolução de energia e validação do conjunto efetivo. |
| Transações reais | Rollback sem gravação parcial; alocações concorrentes; geração versus alocação; duas correções da mesma geração. |
| HTTP transversal | JSON malformado, corpo excessivo, status/corpos de resposta e rate limiting com 429. |
| Inicialização | Checkout novo, geração explícita do cliente Prisma, aplicação das migrações e build em Linux. |

Em todas as operações energéticas relevantes, verificar:

1. Soma das gerações = total gerado do saldo da distribuidora na competência.
2. Soma das alocações = total alocado do mesmo saldo.
3. Disponibilidade = total gerado − total alocado, sem valor negativo.
4. Falhas não deixam alterações parciais e movimentos ajustam origem e destino.

A cobertura pretendida é funcional sobre 31/31 rotas e os invariantes de negócio.
Não confundir isso com promessa de 100% de linhas cobertas. Registrar o resultado por rota
e configurar CI para executar verificações e testes em PostgreSQL isolado antes da fase 3.

Aceite: suíte repetível do zero, todas as rotas marcadas na matriz, testes de integração
e concorrência passando, build Linux validado e nenhuma falha de integridade conhecida aberta.

## 6. Fase 3 — Retomar os requisitos do MVP

Somente após o aceite das fases 1 e 2, seguir o documento de requisitos preservado:

1. Registro mensal de consumo consolidado por empresa.
2. Consultas históricas e filtros por período para as métricas.
3. Endpoints do cliente com isolamento por empresa e agregações administrativas.
4. Dashboards administrativo e do cliente, com distinção entre zero e dado não informado.

Cada funcionalidade nova passa a incluir seus testes desde a implementação, aproveitando
a infraestrutura da fase 2. Não reintroduzir contratos, cobranças ou métricas financeiras.

## 7. Próxima ação ao retomar

Solicitar e aguardar revisão do código da fase 1, com base nos commits e nas evidências em
[progresso-fase1.md](progresso-fase1.md). As implementações F01–F21 estão concluídas;
as fases 2 e 3 não foram iniciadas. Tratar eventuais ajustes dessa revisão antes de avançar.
Build Linux permanece pendente por indisponibilidade do runtime adequado no ambiente atual.
O banco existente não foi auditado nem migrado. R01/R02 e decisões D01–D03 continuam explícitos
na auditoria; nenhuma correção de dados ou nova regra de produto foi aplicada por suposição.
