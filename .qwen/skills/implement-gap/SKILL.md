---
name: implement-gap
description: Implement a pre-designed OpenSpec gap from .qwen/design/ — read the design, write tests first, implement code, build, and commit. Use when the user says "implement gap-N" or "build X" where a design doc already exists.
source: auto-skill
extracted_at: '2026-06-07T03:33:20.304Z'
---

# Implement Gap from OpenSpec Design

Use this workflow when the user wants to implement a capability that already has an OpenSpec design doc in `.qwen/design/`. The workflow is strictly TDD: read the spec → write tests → make them pass → build → commit.

## When to use

- User says "implement gap-N" or "build gap-N"
- User says "do gap-N" and `.qwen/design/gap-N-*/` exists
- Design docs already have `proposal.md`, `spec.md`, `design.md`, `tasks.md`

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

## Step 6: Build + Typecheck

```bash
npm run build
npm run typecheck
```

Fix **all** TypeScript errors and ESLint warnings. Common failures:

| Error                                | Fix                                        |
| ------------------------------------ | ------------------------------------------ |
| TS6133 unused variable               | Remove or prefix with `_`                  |
| TS2345 wrong type                    | Add missing fields, cast, or fix interface |
| TS6196 unused import                 | Remove it                                  |
| `@typescript-eslint/no-explicit-any` | Replace with `Record<string, unknown>`     |
| `@typescript-eslint/no-unused-vars`  | Prefix unused args with `_`                |

## Step 7: Regression Check

Run the existing test suite to confirm no breakage:

```bash
cd packages/core && npx vitest run --no-watch
```

Failures in existing tests are regressions. Fix them before committing.

## Step 8: Commit

```bash
git add packages/core/src/<new-capability>/
git commit -m "feat(<scope>): implement <capability>

- Component1: what it does
- Component2: what it does
- Unit tests covering X, Y, Z
- No regression in existing suite"
```

## Step 9: Mark Tasks Done

Update `tasks.md` to mark completed items:

```markdown
- [x] 1.1 Create directory
- [x] 2.1 Implement TokenBudgetManager
- [ ] 3.1 Implement YAML parser ← still pending
```

## Iteration Rules

- Do not skip the "read design" step. The spec is your contract.
- Do not write implementation before tests. TDD order is mandatory.
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
