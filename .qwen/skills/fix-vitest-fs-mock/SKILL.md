---
name: fix-vitest-fs-mock
description: Fix broken tests when Node.js fs module mocks silently intercept imports
source: auto-skill
extracted_at: '2026-06-07T12:53:52.927Z'
---

# Fix Vitest fs Mock Tests

## Problem

When a test file uses `vi.mock('node:fs')`, it replaces the entire module with a factory-defined mock. If a function under test imports a specific export (e.g., `rmSync`), but the test file itself also imports the real `fs`, the test can silently call a mocked version while asserting a real version, leading to confusing test failures.

## Symptoms

- Tests pass in isolation but fail when run with the full suite
- `fs.rmSync` appears to be called but the assertion fails
- Mock verification shows 0 calls even though the code clearly ran
- Error messages show `rmSync` was called but the spy/mocked check is 0

## Solution

1. **Read the test file** to see how `fs` is mocked
2. **Check if the test imports the real `fs` module** — if so, the test is holding a reference to the original function, while the code under test uses the mocked version
3. **Use `vi.spyOn(require('node:fs'), 'rmSync')` instead of `vi.mocked` or direct `fs` access**
   - This ensures the test has the same reference as the code under test
   - The spy sits on the actual module instance that the code under test sees
4. **Run the test again** — verify it passes
5. **Run the test with the full suite** to confirm no isolation leak

## Example

**Before (broken):**

```typescript
import { rmSync } from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

// Test uses rmSync but it was never mocked - so it calls the real one
// But the test under test calls the mocked one
// Assertion fails because it sees 0 calls
```

**After (fixed):**

```typescript
import fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

const rmSpy = vi.spyOn(fs, 'rmSync');

// Now test code under test and the spy share the same reference
// Assertion sees the actual calls
```

## Key Insight

`vi.mock` intercepts the module import. When the test file imports `rmSync` from the module, it gets the real function. But the code under test gets the mocked module. Using `vi.spyOn` on the module instance (`fs`) ensures both the test and the code under test share the same reference.

## Files to Check

- `packages/core/src/config/init-prompts.test.ts` (has known mock setup pattern)
- `packages/cli/src/services/tools.test.ts`
- `packages/cli/src/services/fileSystem.test.ts`
