# Design Spec: Integration Tests for Lyra Features (P5)

**Status:** Draft  
**Priority:** MEDIUM  
**Depends on:** None  
**Blocks:** None

---

## Problem

`globalInitPrompts` has unit tests (`config.test.ts`) but no E2E test verifying that injected prompts actually appear in the system instruction sent to the model. The prism script has no tests at all.

## What Needs Testing

### 1. `globalInitPrompts` End-to-End

**Test:** Set `globalInitPrompts` in settings → launch session → verify prompt content in system instruction.

**Approach:** Use the existing integration test framework (`integration-tests/`):

```typescript
// integration-tests/cli/global-init-prompts.test.ts
test('globalInitPrompts content appears in system instruction', async () => {
  // 1. Write a test prompt file with unique marker
  const marker = `LYRA_TEST_MARKER_${Date.now()}`;
  const tmpFile = path.join(os.tmpdir(), 'lyra-test-init.md');
  fs.writeFileSync(tmpFile, marker);
  
  // 2. Set globalInitPrompts in settings
  const settings = { context: { globalInitPrompts: [tmpFile] } };
  
  // 3. Launch session with mock LLM that captures system instruction
  const session = await launchSession({ settings, mockLlm: true });
  
  // 4. Verify marker appears in system instruction
  expect(session.systemInstruction).toContain(marker);
});
```

### 2. `--init-prompt` CLI Flag (after P3 implementation)

**Test:** Launch with `--init-prompt /tmp/test.md` → verify content in system instruction.

### 3. Prism Script

**Test:** Run `qwen-lyra-prism.sh` with test tension/refraction files → verify session starts with correct prompts.

### 4. Merge Order (settings + env + cli)

**Test:** All three sources contribute to final prompt in correct order.

## Framework

Per AGENTS.md, integration tests run from the project root:

```bash
npm run test:integration:cli:sandbox:none
```

Tests live in `integration-tests/cli/` and use the session helper pattern.

## Implementation Plan

1. Create `integration-tests/cli/global-init-prompts.test.ts`
2. Add a test-only mode to capture system instruction without actually calling the LLM
3. Write 3-5 test cases:
   - Single file injection
   - Multiple files concatenated with `---` separator
   - Missing file gracefully skipped
   - Env var `QWEN_LYRA_INIT_PROMPTS` works
   - CLI `--init-prompt` flag works (after P3)
4. Add to CI (if applicable)

## Risks

- Integration tests require a built bundle (`npm run build && npm run bundle`)
- Mock LLM setup may need adjustments to capture system instructions
- Test execution time — keep under 60s total

## Effort

Medium — test infrastructure setup is the bulk of the work. Individual test cases are straightforward.
