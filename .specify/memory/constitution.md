<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1 (PATCH: Continuous Commit Discipline clarified —
  confirmation required before any commit; automatic silent commits removed)

Principles unchanged:
  I.   Code Quality & TypeScript Discipline
  II.  Testing Standards (NON-NEGOTIABLE)
  III. REST API Conventions
  IV.  Reusability & Minimal Dependencies
  V.   Accessibility & Modern UI

Sections added:
  - "Continuous Commit Discipline" under Development Workflow & Review Gates

Sections unchanged:
  - Hardcoded Constraints
  - Core Principles (I–V)
  - Amendment procedure, Versioning policy, Compliance review

Templates status:
  ✅ .specify/memory/constitution.md — this file (updated now)
  ✅ .specify/extensions/git/git-config.yml — all after_* auto_commit entries enabled
  ✅ .specify/extensions.yml — all after_* hooks are optional (confirmation required)
  ✅ .specify/templates/plan-template.md — no change required (Constitution Check gates unchanged)
  ✅ .specify/templates/spec-template.md — no change required
  ✅ .specify/templates/tasks-template.md — no change required

Deferred TODOs:
  - None.
-->

# Scribble Constitution

## Core Principles

### I. Code Quality & TypeScript Discipline

Every file in `backend/src/` and `frontend/src/` MUST be fully typed TypeScript.
`any` is forbidden; use `unknown` when a type is genuinely dynamic and narrow it
explicitly. Functions MUST be pure where possible; side effects MUST be explicit and
isolated to service layers. Dead code, commented-out blocks, and unused imports MUST
NOT be committed. All shared types MUST be co-located with the module that owns them —
no duplicated interface definitions across backend and frontend. ESLint (with
`@typescript-eslint`) is the enforced linter; builds MUST pass with zero lint errors.

**Rationale**: The starter codebase already uses strict TypeScript and Zod throughout;
this principle locks in that discipline and prevents silent erosion as features are added.

### II. Testing Standards (NON-NEGOTIABLE)

Tests MUST be written before implementation (TDD). The Red-Green-Refactor cycle is
mandatory for every new behavior. All features MUST be covered by three test tiers:

- **Unit tests**: Every pure function, validator, and utility — isolated, no network or
  file I/O. Run with `vitest` (frontend) and `jest` / `tsx --test` (backend).
- **Integration tests**: Every API endpoint MUST have at least one integration test
  that boots the real Express app and issues real HTTP calls. No mocking the router or
  service layer in integration tests.
- **End-to-end (E2E) tests**: Every business scenario from the README (`Scenario 1–4`)
  MUST have a Playwright E2E test that drives two browser tabs simultaneously and
  verifies cross-player sync.

Tests MUST be committed in the same commit as the code they cover. A PR with new
behavior and no tests MUST NOT be merged. Mocking is permitted only at external
boundaries (e.g., `Date.now` for determinism); internal modules MUST NOT be mocked.

**Rationale**: The starter has zero test coverage. Strict TDD prevents regression as
four scenarios are implemented incrementally.

### III. REST API Conventions

All backend endpoints MUST follow these rules without exception:

- **HTTP verbs**: GET for reads, POST for creates, PATCH for partial updates,
  DELETE for removals. No RPC-style routes (e.g., `/rooms/:code/doStart`).
- **Status codes**: 200 OK, 201 Created (with Location header), 400 Bad Request
  (validation failure), 404 Not Found, 409 Conflict (duplicate/state collision),
  500 Internal Server Error (unhandled). No blanket 200 for error responses.
- **Request validation**: Every endpoint that accepts a body MUST validate it with Zod
  before touching the service layer. Invalid payloads return 400 with a structured
  `{ error: string, details?: unknown }` body.
- **Response shape**: Success responses return the resource or an explicit `{ ok: true }`
  acknowledgement. Error responses MUST NEVER return stack traces in production.
- **Path structure**: `/api/rooms`, `/api/rooms/:code`, `/api/rooms/:code/join`,
  `/api/rooms/:code/guesses` — pluralised nouns, no verbs in paths.

**Rationale**: The starter already has three endpoints; this principle ensures new
endpoints (start, guesses, results, restart) follow a consistent, predictable contract.

### IV. Reusability & Minimal Dependencies

**Reuse before creating**: Before adding a new component, function, or hook, search for
an existing one. Extract shared logic into a reusable utility or component when the
same code appears in two or more places. React components MUST accept typed props and
MUST NOT contain hardcoded data that belongs in a service or store.

**Dependency discipline**: A new `npm` dependency MUST be justified in a PR description
with a concrete reason and proof that the existing stack cannot cover the need. The
following categories are prohibited additions: WebSocket libraries, database clients,
authentication packages, state-management libraries beyond what the starter ships,
CSS-in-JS libraries, and utility belts that duplicate native browser/Node APIs.
`node_modules` package count MUST NOT increase without documented justification.

**Duplication rule**: The same logic or JSX structure MUST NOT appear in more than one
file. Extract to `frontend/src/components/` (UI) or `frontend/src/hooks/` (logic) or
`backend/src/utils/` (shared backend helpers) on first duplication.

**Rationale**: The starter already ships a lean dependency set. Keeping it lean prevents
supply-chain risk and keeps build times fast for a lab-scale project.

### V. Accessibility & Modern UI

Every interactive element in the frontend MUST meet WCAG 2.1 Level AA:

- All images MUST have meaningful `alt` attributes (or `alt=""` if decorative).
- All form inputs MUST have associated `<label>` elements or `aria-label` attributes.
- All interactive controls MUST be keyboard-reachable and operable via Enter/Space.
- Color contrast ratio MUST be ≥ 4.5:1 for normal text and ≥ 3:1 for large text.
- Focus indicators MUST be visible and MUST NOT be removed via `outline: none` without
  a custom replacement.
- Error messages MUST be associated with their triggering input via `aria-describedby`.

React patterns: functional components only, no class components. Hooks for local state
and side effects. No inline styles for layout or theming — use CSS Modules or the
existing `app.css`. Components MUST render meaningful semantic HTML (`<button>`, `<nav>`,
`<main>`, `<form>`, `<ul>`) rather than unstyled `<div>` chains.

**Rationale**: Accessibility is a non-negotiable baseline, not a polish step. Semantic
HTML also improves Playwright selector reliability in E2E tests.

## Hardcoded Constraints

These boundaries are set by the lab assignment and MUST NOT be overridden without
explicit written approval from the reviewer. They override any principle above:

- **No WebSockets or real-time push**: All multi-player sync MUST use HTTP polling only.
  Polling cadence MUST be approximately 2 seconds.
- **No persistent storage**: All data lives in the backend's in-memory store. Restarting
  the backend clears all state. No SQLite, IndexedDB, localStorage, or cookies.
- **No authentication**: No sessions, JWT, OAuth, or user accounts.
- **No new routing or state-management libraries**: React Router v6 and the existing
  store pattern (`roomStore.ts`) are the ceiling.
- **Single round only**: No timers, countdowns, drawer rotation across rounds, or
  multi-round scoring across games. One round per game session.
- **Starter word list only**: Words are deterministically selected from
  `["rocket", "pizza", "castle", "guitar", "sunflower"]`. No random word packs.

## Development Workflow & Review Gates

**Constitution Check (mandatory before any PR merge)**:

Every code change MUST pass all five gates before merge:

1. Zero TypeScript errors (`tsc --noEmit`) and zero ESLint errors.
2. All new behavior covered by unit + integration + E2E tests; tests are committed
   alongside implementation in the same commit.
3. All new API endpoints conform to the REST conventions in Principle III; verified
   by the integration tests hitting the real Express app.
4. No new `npm` dependency added without PR-description justification.
5. Interactive elements pass a manual keyboard-navigation check and axe-core (or
   Playwright accessibility assertions) shows zero violations.

**Continuous Commit Discipline (NON-NEGOTIABLE)**:

After every completed SpecKit command or implementation task, a commit MUST be
proposed to the developer for confirmation. The developer MUST approve the commit
before it is created. A commit MUST NOT be created — even with approval — if either
of the following conditions fails:

- `tsc --noEmit` (or `npm run build`) exits with zero errors in all affected packages.
- `npm test` exits with zero test failures in all affected packages.

If compilation or tests fail, the commit is blocked. The failing output MUST be
surfaced to the developer before any commit is attempted. Partial work MUST be staged
and stashed or left uncommitted until the failure is resolved.

Commit proposals are surfaced via the Spec Kit git extension (`after_*` hooks in
`.specify/extensions.yml`, all set to `optional: true`). The `auto_commit` entries in
`.specify/extensions/git/git-config.yml` are enabled so the commit executes once the
developer confirms. Silent auto-commits that bypass developer confirmation are
forbidden by this rule.

**Rationale**: Confirmation before commit keeps the developer in control of the git
history while still ensuring every command output is tracked. Gating on compilation
+ test success ensures no broken state is ever committed.

**Amendment procedure**: A principle may be changed only by opening a PR that (a) edits
this file, (b) bumps `CONSTITUTION_VERSION` per semantic versioning rules, (c) updates
all affected templates and docs, and (d) receives explicit reviewer sign-off. No verbal
or chat-only amendments are binding.

**Versioning policy**:
- MAJOR bump: backward-incompatible removal or redefinition of a principle.
- MINOR bump: new principle or material section added.
- PATCH bump: clarification, wording, or typo fix.

**Compliance review**: Every PR description MUST include a "Constitution Check" section
confirming each gate passes or documenting the deviation with justification. Reviewers
MUST reject PRs where the Constitution Check section is absent.

**Version**: 1.1.1 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
