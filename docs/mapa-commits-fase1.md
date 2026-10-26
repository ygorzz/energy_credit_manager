# Mapa de commits da fase 1

Reorganização local em 25/10/2026, autorizada pelo responsável para incorporar os comentários
em inglês aos respectivos achados. Autoria, mensagens e código executável foram preservados.
Referências no plano, na auditoria e no acompanhamento foram atualizadas.

Histórico anterior preservado na branch `codex/phase1-before-comments-20261025`.
O remoto não foi atualizado. As demais alterações documentais em revisão foram mantidas.

| Commit anterior | Commit atual | Alteração |
| --- | --- | --- |
| `ebab83f` | `0456a14` | fix: validate user on auth middleware |
| `bd6d617` | `e1df062` | fix: validate authorization header and jwt payload |
| `5b689e2` | `596c22b` | docs: record autonomous phase one execution workflow |
| `2542dd0` | `e95c73a` | fix: prevent distributor changes for plants with generation history |
| `81a9949` | `72b1484` | fix: prevent distributor changes for companies with allocations |
| `ae2433d` | `b483aaa` | fix: protect generation balances with serializable transactions |
| `7f570aa` | `4f07a34` | fix: preserve decimal precision in generation adjustments |
| `29f6dd0` | `2b31e1f` | fix: validate effective allocation percentage on updates |
| `afecfb5` | `b1fb85d` | fix: honor company allocation percentage when omitted or null |
| `9f5cd34` | `43ff1f6` | fix: compare allocation percentages with decimal rounding |
| `7dd7a56` | `4963d80` | fix: reject allocations without positive generation |
| `0a36b81` | `eeba794` | fix: constrain company allocation percentage to valid integers |
| `840a671` | `39e33c1` | fix: enforce valid company links for client users |
| `6f1931e` | `f5cf64d` | fix: return generation record after quantity updates |
| `c6a1c15` | `273aa17` | fix: use success status for generation updates and deletions |
| `0576548` | `0d019c0` | fix: translate expected persistence failures into API errors |
| `0051764` | `912adb1` | fix: handle body parser failures without logging sensitive data |
| `157421b` | `7174091` | fix: order paginated lists deterministically |
| `a176d9b` | `8fa914e` | fix: match auth import to tracked directory casing |
| `6f18500` | `3ed5015` | fix: add missing monthly balance defaults migration |
| `b5729c2` | `9978e82` | fix: make administrator bootstrap configurable and idempotent |
| `2ea4a0e` | `85fcbda` | refactor: normalize formatting and development guidance |
| `915f984` | `e0cedfd` | docs: record phase one completion and review handoff |

Validação: 256 versões de arquivos comparadas sem alterações nos tokens executáveis;
check, build, lint, format:check e biome:check passaram. As fases 2 e 3 não foram iniciadas.

## Revisão da F14 — tratamento nos serviços

Em 25/10/2026, o responsável autorizou substituir a F14 para remover o helper compartilhado
e tratar os erros diretamente nos serviços. Os sete commits posteriores foram reaplicados,
mantendo autoria e mensagens. A tabela acima aponta para os hashes atuais.

Histórico imediatamente anterior preservado em `codex/phase1-before-f14-inline-20261025`.
Alterações locais do responsável foram preservadas; nenhum push foi realizado.

| Antes da revisão F14 | Após a revisão F14 | Alteração |
| --- | --- | --- |
| `b34d194` | `0d019c0` | fix: translate expected persistence failures into API errors |
| `35602fb` | `912adb1` | fix: handle body parser failures without logging sensitive data |
| `ee9ea57` | `7174091` | fix: order paginated lists deterministically |
| `ee8af2b` | `8fa914e` | fix: match auth import to tracked directory casing |
| `f0f2840` | `3ed5015` | fix: add missing monthly balance defaults migration |
| `e78d0b2` | `9978e82` | fix: make administrator bootstrap configurable and idempotent |
| `24c1bd8` | `85fcbda` | refactor: normalize formatting and development guidance |
| `fc789b0` | `e0cedfd` | docs: record phase one completion and review handoff |

Verificação: 133 cenários de diagnóstico em memória sobre 12 operações passaram,
assim como tipos, build, lint, formatação e Biome. Sem acesso ao banco nesta revisão.
