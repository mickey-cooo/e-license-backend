# e-licensing-backend

NestJS 11 + TypeORM + PostgreSQL API for e-licensing. Merchants register, get license advice for their business type, and submit documents. Admins review them. Document progress is pushed over a websocket. Review and plan: `plans/service-review-and-needs.md`.

## Skills

Project skills live in `.claude/skills/`. Before starting work that matches one, read its `SKILL.md` (and the `references/` files it points to) and follow it.

| Skill | Read it when |
|---|---|
| `.claude/skills/nestjs-expert/SKILL.md` | Adding or changing modules, controllers, services, DTOs, guards, pipes, interceptors, Swagger, or Nest tests |
| `.claude/skills/typescript-pro/SKILL.md` | Typing problems: generics, type guards, utility types, decorator metadata errors |
| `.claude/skills/code-reviewer/SKILL.md` | Reviewing a diff, branch or PR |
| `.claude/skills/security-reviewer/SKILL.md` | Auth, roles, input handling, secrets, dependency or security reviews |

Read a skill when the task needs it. Do not load all four up front. Where a skill disagrees with the conventions below, the conventions below win: they describe this codebase.

## Before a commit

When the user asks to commit, do not commit yet. First run both skills on the changes that would be committed:

1. Run the `code-reviewer` skill (`.claude/skills/code-reviewer`) and the `security-reviewer` skill (`.claude/skills/security-reviewer`). Use the `Skill` tool if they are listed there. Otherwise read each `SKILL.md` (and the `references/` files it points to) and carry out its workflow yourself. Do not only read them.
2. Run them on everything that would be committed: `git diff`, staged and unstaged, plus new files. Both skills must finish, each with its own findings.
3. Fix the findings that are clear bugs or security holes, then re-run `npx tsc --noEmit` and `npm test`. Report anything you did not fix, with the reason.
4. Only then commit, using the commit format from the user's global instructions.

If the user says to skip the review, skip it and say so in one line. A docs-only change (`*.md`, `plans/`) does not need it.

## Commands

```bash
npm run start:dev        # watch mode
npm run build            # nest build
npm test                 # unit tests (src/**/*.spec.ts), no database needed
npx tsc --noEmit         # type check
npm run test:e2e         # needs a real Postgres, see below
```

`npm run lint` is currently broken (`eslint.config.mjs` rejects its own `no-unused-vars` setting). Format with `npx prettier --write "src/**/*.ts" "test/**/*.ts"`.

E2E tests use a real database and truncate its tables. Point them at a throwaway one, never at real data:

```bash
docker run -d --rm --name elic-e2e-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=elic -p 55432:5432 postgres:16
DB_HOST=127.0.0.1 DB_PORT=55432 DB_USERNAME=postgres DB_PASSWORD=pw DB_DATABASE=elic \
JWT_SECRET=test-secret-that-is-at-least-32-characters FRONTEND_URL=http://localhost:5173 \
MAILER_HOST=127.0.0.1 MAILER_PORT=1 MAILER_USER=a@b.c MAILER_PASSWORD=x NODE_ENV=test \
npx jest --config ./test/jest-e2e.json --runInBand --forceExit
```

## Config

The app refuses to start unless these env vars are set (see `.env.template`, checked in `src/utils/config/validate-env.ts`): `NODE_ENV` (`development`, `test` or `production`), `DB_*`, `JWT_SECRET` (32+ characters), `FRONTEND_URL`, `MAILER_*`. Optional: `PORT`, `MAILER_FROM`, `TRUST_PROXY` (number of proxy hops).

Read env through `ConfigService`, not `process.env` at import time. `ConfigModule` loads `.env` after module files are imported, so early reads are `undefined`.

Schema: `synchronize` is on outside production and off in production. There are no migrations yet; add them before the first production deploy.

## Layout

```
src/
  main.ts                 bootstrap: prefix api/v1, helmet, CORS, ValidationPipe, filter, Swagger (non-prod)
  app.module.ts           config, JWT (global), throttler, TypeORM, global guards
  user/ merchant/ license-advisory/ document-workflow/ mailer/
  database/               *.entity.ts (TypeORM entities, TemplateEntity base)
  guard/                  AuthGuard, RoleGuard
  decorator/              @Public, @Roles, @Token
  enum/                   statuses, RoleType, document transitions
  utils/                  actor helpers, env validation, exception filter, logger
test/app.e2e-spec.ts      end-to-end flow against Postgres
```

## Conventions

**Auth.** Three global guards run in order: throttler, `AuthGuard`, `RoleGuard`. Every route needs a login unless it has `@Public()`. Restrict a route with `@Roles(RoleType.ADMIN)`; `SUPER_ADMIN` always passes. `AuthGuard` loads the user from the database on each request, so a deleted user or a role change applies at once. `request.user` is `{ id, role }`.

**Who is calling.** Controllers take `@Token() actor: Actor` (import `type Actor` from `utils/auth/actor`). Never read "who did it" from the request body: audit columns (`createdBy`, `updatedBy`, `submittedBy`, `reviewedBy`) come from `actor.id`.

**Ownership.** Role checks are not enough. Services also check that a non-admin only touches their own data: `assertSelfOrAdmin`, `assertCanManageUser` (a plain admin cannot change another admin), `MerchantService.assertCanAccessMerchant`, and `submittedBy === actor.id` for documents.

**Validation.** `ValidationPipe` runs with `whitelist`, `forbidNonWhitelisted` and `transform`. Every request field needs a `class-validator` decorator, or it is rejected with 400. Nested objects need `@ValidateNested()` and `@Type(() => Dto)`. Emails are lower-cased with `lowerCaseEmail`.

**Errors.** Throw Nest exceptions (`BadRequestException`, `NotFoundException`, ...) and let them propagate. Do not wrap in `catch (e) { throw new Error(e) }`: it turns a 4xx into a 500. Catch Postgres error `23505` only to turn a unique violation into a 400.

**Writes.** Several writes that must succeed together go inside `dataSource.transaction(async (manager) => ...)` and use `manager`, not the injected repositories (those use other connections). A status change puts the old status in the `WHERE` and checks `affected`, so a concurrent change loses cleanly.

**Passwords and tokens.** bcrypt cost 10, passwords 8 to 72 characters. Sign-in returns one error for unknown email and wrong password. Reset tokens are random, stored as a sha256 hash, valid for 1 hour, and usable once.

**Status flows.** Merchant: `pending -> approved | rejected`, reviewed by an admin. A non-admin who changes merchant name, tax ID, registration number or type sends it back to `pending`. Document: `documentTransitions` in `src/enum/document-workflow.status.ts`; owners can change a document only while it is `submitted`.

**Lists.** Return `{ data, total }`. Use `.offset()` and `.limit()` with raw selects (`skip` and `take` are ignored when a query has joins).

**Imports.** Use relative paths. A bare `src/...` import works in the editor and crashes the built app.

**Tests.** New logic with a branch, a money or security effect, or a data write gets a test. Pure rules go in unit specs next to the code. Anything touching the database, guards or the websocket goes in the e2e file. The e2e app repeats the prefix, pipe and filter from `main.ts`; keep them in sync.
