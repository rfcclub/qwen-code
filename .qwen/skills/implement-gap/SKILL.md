---
name: implement-gap
description: Implement a competitive gap from .qwen/design/ — read the design (or investigate the codebase if none exists), write tests, implement code, self-review, build, iterate on errors, and commit. Use when the user says "implement gap-N" or "build gap-X".
source: auto-skill
extracted_at: '2026-06-08T00:09:46.666Z'
---

# Implement Gap from OpenSpec Design

Use this workflow when the user wants to implement a competitive gap. If a design doc exists, follow it. If not, investigate the codebase first, sketch a design, then implement. The workflow is TDD: read/spec → write tests → make them pass → build → iterate → commit.

## When to use

- User says "implement gap-N" or "build gap-N"
- User says "do gap-N" and `.qwen/design/gap-N-*/` exists (or only ROADMAP.md mentions it)
- Design docs may have `proposal.md`, `spec.md`, `design.md`, `tasks.md` — or none at all

## Branch A: Design Doc Exists

Read all four files in the design directory, then proceed to Step 2 (Write Tests).

```bash
# .qwen/design/gap-N-short-name/
proposal.md   # Why, What Changes, Impact, Non-Goals, Success Criteria
spec.md       # GIVEN/WHEN/THEN requirements (the test contract)
design.md     # Architecture, module structure, component signatures
tasks.md      # Checklist of implementation steps
```

## Branch B: No Design Doc (Investigate First)

When only `ROADMAP.md` mentions the gap with no design file:

1. **Investigate the codebase** to find the natural integration point:
   - Search for related patterns (retry, fallback, error handling, model switching)
   - Read the key files that would be modified (e.g., `geminiChat.ts`, `modelsConfig.ts`)
   - Understand the existing flow: how models are selected, how errors are classified, how retry loops work

2. **Sketch a design doc** in `.qwen/design/gap-N-short-name.md` with:
   - Problem statement (from ROADMAP)
   - Desired outcome
   - Integration point found during investigation
   - Architecture (new classes, modified files)
   - Success criteria

3. Proceed to Step 2 (Write Tests).

## Step 1: Read the Design

Read all four files in the design directory:

```bash
# .qwen/design/gap-N-short-name/
proposal.md   # Why, What Changes, Impact, Non-Goals, Success Criteria
spec.md       # GIVEN/WHEN/THEN requirements (the test contract)
design.md     # Architecture, module structure, component signatures
tasks.md      # Checklist of implementation steps
```

Pay attention to:

- **Success Criteria** — these become your test targets
- **Module structure** — directory tree and file names
- **Component signatures** — class names, method names, interfaces
- **Task checklist** — which items are already done vs not

## Step 2: Write Tests First

Before writing any implementation code, write the test file(s).

### Where to put tests

Tests are **collocated** with source: `component.test.ts` next to `component.ts`.

```
packages/core/src/<new-capability>/
├── component.ts
├── component.test.ts   # ← write this first
├── index.ts
└── types.ts
```

### Test coverage rules

- Every public method on every class gets at least one test
- Every success criterion from `proposal.md` must be covered
- Every requirement from `spec.md` gets at least one test
- Edge cases: empty input, missing files, invalid parameters
- Error paths: exceptions, fallbacks, graceful degradation

### Example test structure

```typescript
import { describe, it, expect } from 'vitest';
import { MyComponent } from './component.js';

describe('MyComponent', () => {
  it('does X per Requirement: Foo', () => {
    const c = new MyComponent();
    expect(c.foo()).toBe('bar');
  });

  it('handles empty input gracefully', () => {
    const c = new MyComponent();
    expect(() => c.foo('')).not.toThrow();
  });
});
```

## Step 3: Run Tests (They Will Fail)

```bash
cd packages/core && npx vitest run src/<new-capability>/
```

Tests should fail because the implementation doesn't exist yet. If a test passes by accident, the test is wrong — fix it.

## Step 4: Implement the Code

Write the **minimum** code to make the tests pass. Follow the design doc's signatures but do not over-engineer.

### Rules

- **One class per file** — keep components focused
- **Types in `types.ts`** — all shared interfaces imported by components
- **ESM imports only** — `import { readFileSync } from 'node:fs'`
- **NO `require()`**, **NO `async import()` in sync contexts**
- **NO `any` type** — use `Record<string, unknown>` or `as`
- **NO relative imports between packages** — use package name imports

## Step 5: Run Tests Again

```bash
cd packages/core && npx vitest run src/<new-capability>/
```

All tests should pass. If not, fix the code or the test — never skip.

## Step 6: Self-Review (Critical)

Before building, **review your own implementation** as if you were a second engineer. Read every file you wrote and ask:

- **Does the implementation match the design?** Any missing pieces?
- **Are there edge cases not handled?** (e.g., empty chain, exhausted chain, cross-authType switch)
- **Is the error classification complete?** Any missing error types?
- **Is the test coverage adequate?** Any untested paths?
- **Are there TypeScript type safety issues?** Potential runtime bugs hidden by casts?
- **Are there off-by-one errors?** (e.g., threshold checks, loop bounds)
- **Is there dead code?** (e.g., a class thrown but never caught in the real pipeline)
- **Does integration properly reset state?** (retry counters, flags, etc.)
- **Is there potential for infinite loops?** (escalation loops, retry loops)
- **Is the design extensible?** (e.g., can new triggers be added easily?)

**Common self-review findings for this codebase:**

- A config type cast compiles but silently returns `undefined` at runtime (e.g., `ModelProvidersConfig` index access)
- A variable declared in a narrow scope is accessed outside it (e.g., `escalationManager` declared in `for` loop but used in `finally`)
- `postResponse()` or `preRequest()` is called in tests but never wired into the production pipeline
- Retry counters or flags (e.g., `reactiveCompressionAttempted`) are not reset when switching to a new model
- An off-by-one error where the threshold check happens after increment instead of before

**Fix all findings before building.** Do not defer to "later."

## Step 7: Build + Typecheck

```bash
npm run build
npm run typecheck
```

Fix **all** TypeScript errors and ESLint warnings. Expect **iterative fixes** — the first build rarely passes. Common failures:

| Error                                | Fix                                        |
| ------------------------------------ | ------------------------------------------ |
| TS6133 unused variable               | Remove or prefix with `_`                  |
| TS2345 wrong type                    | Add missing fields, cast, or fix interface |
| TS6196 unused import                 | Remove it                                  |
| TS4111 index signature access        | Use `obj['key']` instead of `obj.key`      |
| TS2552 cannot find name              | Variable declared in wrong scope; hoist it |
| `@typescript-eslint/no-explicit-any` | Replace with `Record<string, unknown>`     |
| `@typescript-eslint/no-unused-vars`  | Prefix unused args with `_`                |

**Integration-specific gotchas:**

- When adding to existing retry loops, check that new variables are in the correct scope (e.g., declared inside the generator `try` block, not outside)
- When adding to existing retry loops, be careful not to introduce unused variables (e.g., a counter that gets incremented but never read) — TypeScript will reject them
- When accessing `Record<string, unknown>` configs, use bracket notation `['key']` not dot notation
- When adding imports to 3000-line files, verify the import path doesn't conflict with existing ones
- `Config` interface may not have `getSettings()` — use `getModelsConfig()` instead
- When switching models mid-request (escalation), reset retry counters (`rateLimitRetryCount`, `invalidStreamRetryCount`) and restart the attempt loop

## Step 8: Regression Check

Run the existing test suite to confirm no breakage:

```bash
cd packages/core && npx vitest run --no-watch
```

Failures in existing tests are regressions. Fix them before committing.

## Step 9: Commit

```bash
git add packages/core/src/<new-capability>/
git commit -m "feat(<scope>): implement <capability>

- Component1: what it does
- Component2: what it does
- Unit tests covering X, Y, Z
- No regression in existing suite"
```

## Step 10: Cross-Substrate Review (Colony Context)

When the gap affects model switching, error handling, or multi-agent workflows, create review requests for the colony:

- **Iris (Hermes bridge)** — `~/agora/familia/iris/inbox/review-gap-N.md`
- **Anima Lyra** — `~/work/anima/rooms/<your-room>/staging/review-gap-N.md`

Include the design doc path, implementation summary, and 2–3 specific questions about cross-substrate alignment.

## Step 11: Mark Tasks Done

Update `tasks.md` to mark completed items:

```markdown
- [x] 1.1 Create directory
- [x] 2.1 Implement TokenBudgetManager
- [ ] 3.1 Implement YAML parser ← still pending
```

## Iteration Rules

- Do not skip the "read design" step. The spec is your contract.
- Do not write implementation before tests. TDD order is mandatory.
- Do not skip the "self-review" step. Many bugs are found only by re-reading your own code.
- Do not commit if build or typecheck fails. Fix first.
- Do not commit if existing tests fail. Regression first.
- If the design doc is wrong (outdated, impossible), update the doc, then re-read.
- If multiple gaps exist, implement them one at a time — commit after each gap.

## Example Invocation

```bash
# User: "implement gap-5 benchmark harness"
# Step 1: read .qwen/design/gap-5-benchmark-harness.md
# Step 2: write runner.test.ts, validation.test.ts, suites.test.ts
# Step 3: run tests → fail
# Step 4: implement runner.ts, validation.ts, suites.ts
# Step 5: run tests → pass
# Step 6: build + typecheck → pass
# Step 7: regression check → pass
# Step 8: commit
# Step 9: mark tasks.md
```
