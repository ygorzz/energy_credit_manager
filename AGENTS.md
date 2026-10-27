# Repository Guidelines

## Project Structure & Module Organization

This Express 5 API manages energy generation and credit allocations using TypeScript, Prisma, and PostgreSQL.

- `src/app.ts` configures middleware and routes; `src/server.ts` starts the server on port 3000.
- `src/modules/` groups features such as `Users` and `Power-Plants`. Follow routes → controller → service → repository, including credit allocations.
- `src/middlewares/`, `src/errors/`, and `src/shared/schemas/` contain shared request handling, application errors, and validation.
- `prisma/` contains the schema, migration history, and seed script. Prisma generates its client into `src/db/generated/prisma/`.
- `dist/` contains compiled output. `test/e2e/` is currently empty; no automated test suite is configured.

## Current Delivery Priorities

Follow `docs/plano-operacao.md` for the persistent delivery sequence and product decisions.
First fix the existing API issues recorded in `docs/auditoria-tecnica.md`, then implement
and pass automated tests for all 31 existing routes. Only afterward implement the approved
MVP requirements preserved in `docs/requisitos-mvp.md`. Do not introduce new MVP features
while the correction and existing-route testing phases remain incomplete.

During Phase 1 only, execute batches sequentially and address one finding at a time.
After verifying each finding, commit its changes with a focused English message and continue
without requesting intermediate review or acceptance. Do not combine findings or include
unrelated changes. Stop after Phase 1 and request the user's code review and approval before
starting Phase 2 or any later work. This exception does not authorize automatic advancement
or commits beyond Phase 1.

## Delegated Questions

Whenever the user asks to delegate a question to a subagent, provide the context needed
about the requirements and decisions already made. Scope the subagent task to analysis
only, without modifying files. Keep the detailed investigation in the subagent's context.
Bring back to the main chat only the conclusion, a brief justification, and any impact
on requirements, the operation plan, or development. Apply this rule to every such request;
it does not authorize delegation unless the user requests it.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: run the API with automatic reload through `tsx`.
- `npm run check`: type-check without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm start`: run the compiled server after building.
- `npm run lint`: lint `src/` with Biome; `npm run lint:fix` applies fixes.
- `npm run format:check`: check formatting; `npm run format` rewrites files.
- `npm run biome:check`: check formatting, lint rules, and imports together.

## Coding Style & Naming Conventions

Use two spaces, single quotes, semicolons, trailing commas, and a 100-character line width, as configured in `biome.json`. Keep TypeScript strict and use `import type` for type-only imports. Relative imports use `.js` extensions for NodeNext compatibility.

Follow existing feature directory names and kebab-case filenames such as `power-plant.service.ts`. Use PascalCase classes, camelCase methods, Zod schemas in `*.dto.ts`, and shared error classes for expected failures.

Preserve existing code comments. Delete a comment only when its associated code block is
also deleted; move it with the corresponding block during refactoring. Write new code
comments and commit messages in English. Add short comments to the main business rules
and significant implementation changes, including Phase 1 corrections and all future
implementations. Summarize the rule or purpose of the block without long explanations
or line-by-line narration. Preserve existing comment wording.

## Testing Guidelines

No test runner, `npm test` script, or coverage threshold is configured. Run type, lint, formatting, and build checks before submitting. Manually verify affected endpoints, including validation failures and authorization. For energy calculations, verify monthly balances after create, update, and delete operations. Document verification steps in the PR.

## Commit & Pull Request Guidelines

Use conventional commits. History uses English messages with `feat:`, `fix:`, and `refactor:` prefixes. Keep commits focused and imperative. PRs should explain behavior changes, link issues, list verification results, and identify migrations or API contract changes. Include request/response examples.

## Security & Configuration

Configure `DATABASE_URL` and `JWT_SECRET` in a local `.env`; never commit credentials. Commit schema changes with their migrations. Regenerate the Prisma client after schema changes; do not edit or commit generated client files. Configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` locally before initial administrative seeding; see `.env.example`. Existing administrator credentials and status are preserved on subsequent runs.
