# Repository Guidelines

## Project Structure & Module Organization

This Express 5 API manages energy generation and credit allocations using TypeScript, Prisma, and PostgreSQL.

- `src/app.ts` configures middleware and routes; `src/server.ts` starts the server on port 3000.
- `src/modules/` groups features such as `Users` and `Power-Plants`. Follow routes → controller → service → repository, including credit allocations.
- `src/middlewares/`, `src/errors/`, and `src/shared/schemas/` contain shared request handling, application errors, and validation.
- `prisma/` contains the schema, migration history, and seed script. Prisma generates its client into `src/db/generated/prisma/`.
- `dist/` contains compiled output. `test/integration/` contains Vitest/Supertest tests; `test/support/` owns isolated database, HTTP server, authentication fixtures, and lifecycle helpers.

## Delivery Scope and Approvals

Read `docs/plano-operacao.md` before resuming development. It is authoritative for delivery
order, product decisions, authorized scope, and required review and approval gates.
Follow its sequencing and commit rules together with the branch and pull request workflow
below. Do not start new features or advance beyond the scope authorized by that plan.
The approved product requirements are kept locally in `docs/requisitos-mvp.md`.
Report newly discovered production defects before fixing them unless explicitly authorized.

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
- `npm run check:test`: type-check application, test helpers, tests, and Vitest configuration.
- `npm test` / `npm run test:integration`: run integration tests once against the dedicated local PostgreSQL database.
- `npm run test:watch`: rerun integration tests when files change.
- `npm run build`: compile TypeScript into `dist/`.
- `npm start`: run the compiled server after building.
- `npm run lint`: lint application, tests, and Vitest configuration with Biome; `npm run lint:fix` applies fixes.
- `npm run format:check`: check formatting; `npm run format` rewrites files.
- `npm run biome:check`: check formatting, lint rules, and imports together.

## Coding Style & Naming Conventions

Use two spaces, single quotes, semicolons, trailing commas, and a 100-character line width, as configured in `biome.json`. Keep TypeScript strict and use `import type` for type-only imports. Relative imports use `.js` extensions for NodeNext compatibility.

Follow existing feature directory names and kebab-case filenames such as `power-plant.service.ts`. Use PascalCase classes, camelCase methods, Zod schemas in `*.dto.ts`, and shared error classes for expected failures.

Preserve existing code comments. Delete a comment only when its associated code block is
also deleted; move it with the corresponding block during refactoring. Write new code
comments and commit messages in English. Add short comments to the main business rules
and significant implementation changes, including corrections, refactoring, and new
features. Summarize the rule or purpose of the block without long explanations
or line-by-line narration. Preserve existing comment wording.

Add comments as implementation progresses, rather than leaving documentation until the
end. This is a permanent rule across the project, including application code, tests,
helpers, and configuration. Explain the purpose of key files, nontrivial functions,
business rules, and important blocks where intent is not obvious. Keep comments brief,
in English, and focused on intent, constraints, or decisions; avoid restating clear code.

## Documentation Guidelines

Markdown files outside `docs/`, including this `AGENTS.md`, must explain the current feature,
behavior, setup, usage, and limitations without requiring implementation-history context.
Do not refer to implementation batches, phases, audit-finding IDs, or delivery chronology
in those explanations. Describe the concrete rule or behavior instead of its tracking label.
Keep planning, progress, audit findings, and approval milestones in `docs/`. Link to the
operation plan for delivery instructions instead of repeating its tracking details here.
Review new and edited Markdown files for this rule before submitting a delivery.

## Testing Guidelines

Use Vitest and Supertest with real PostgreSQL, authentication, services, repositories, and
rate limiters. Configure `.env.test` from `.env.test.example`; `TEST_DATABASE_URL` must name
the exclusive local database `energy_credit_manager_test`. Never use the application
database, administrative seed, SQLite, or mocked persistence as integration evidence.
The harness validates the target, holds a run lock, applies existing migrations, clears
only business tables between cases, and closes HTTP/database connections. No coverage
threshold is configured. See `test/README.md` for setup, isolation safeguards, and coverage limits.

Concurrency tests must observe overlapping PostgreSQL transactions before releasing the
test gate; starting concurrent promises alone is not evidence of overlap. Test-only failure
triggers belong exclusively to the guarded test database and must be removed in `finally`.
CI runs on Ubuntu with Node 24/PostgreSQL 18. Test infrastructure and changed supported
files are strictly checked by Biome; the existing global formatting debt is reported separately.

Run application/test type checks, lint, formatting, build, and relevant integration tests
before submitting. Include UUID/Zod failures, authorization, and unchanged database state
after rejected writes. For energy operations, verify source/destination monthly balances
after create, update, and delete. Document results and pre-existing failures in the PR.

## Commit & Pull Request Guidelines

Use conventional commits. History uses English messages with `feat:`, `fix:`, and `refactor:` prefixes. Keep commits focused and imperative. PRs should explain behavior changes, link issues, list verification results, and identify migrations or API contract changes. Include request/response examples.

### Required delivery workflow

For every authorized delivery (request, feature, documentation update, or other agreed scope):

1. Verify the repository state and current target branch on GitHub, then create a dedicated
   branch for the delivery before committing its changes. Preserve unrelated local work.
2. Implement the agreed scope with explanatory comments, run the appropriate checks, and
   commit only the delivery's changes with focused English conventional commit messages.
3. Push that branch and open a GitHub pull request against the verified target branch.
   Use an English title and description covering the final behavior, validation, and limitations.
4. Return the PR link and stop for the user's review, validation, and merge on GitHub,
   outside the IDE workspace. Creating a branch or a local commit alone is not a complete delivery.
5. Address requested revisions on the same branch and PR. Before dependent work resumes,
   verify the PR's remote state and fetch the merged target branch; preserve local changes
   and do not assume that an external review has already been merged.

The user owns review, validation, and merge. Do not merge, enable auto-merge, or push delivery
commits directly to `main` or another target branch. The approval requirements in
`docs/plano-operacao.md` still apply. Follow this workflow for documentation and
development-rule updates as well.

## Security & Configuration

Configure `DATABASE_URL` and `JWT_SECRET` in a local `.env`; never commit credentials. Commit schema changes with their migrations. Regenerate the Prisma client after schema changes; do not edit or commit generated client files. Configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` locally before initial administrative seeding; see `.env.example`. Existing administrator credentials and status are preserved on subsequent runs.

Keep `.env.test` untracked. Tests generate a fresh JWT secret per run and never fall back
to application database credentials. Cleanup is destructive only inside the guarded test
database; never bypass the destination checks or replace them with a reset of another database.
