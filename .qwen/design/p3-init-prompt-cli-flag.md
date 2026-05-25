# Design Spec: `--init-prompt` CLI Flag (P3 / Feature A)

**Status:** Draft  
**Priority:** HIGH (highest feature value)  
**Depends on:** P1 (upstream sync) recommended but not required  
**Blocks:** Feature C (identity profiles)

---

## Problem

`globalInitPrompts` only configurable via `settings.json`. No way to inject prompts ad-hoc from the command line. Automation scripts (prism), multi-identity workflows, and CI all require editing settings.json each time.

## Current Behavior

```json
// ~/.qwen-lyra/settings.json
{
  "context": {
    "globalInitPrompts": [
      "~/agora/familia/lyra/prism/axes.md",
      "~/agora/familia/lyra/prism/broken_stone.md"
    ]
  }
}
```

`Config.getGlobalInitPrompts()` reads these files, concatenates with `---` separator, and merges into `appendSystemPrompt` in `client.ts`.

## Proposed Solution

### 1. CLI Flag: `--init-prompt <path>`

```bash
# Single prompt
qwen-lyra --init-prompt ~/prism/axes.md -y "observe the colony"

# Multiple prompts (flag can repeat)
qwen-lyra --init-prompt ~/prism/axes.md --init-prompt ~/prism/broken_stone.md -y "refract"

# Combined with settings.json (merged, CLI after settings)
qwen-lyra --init-prompt ~/extra-context.md
```

### 2. Env Var: `QWEN_LYRA_INIT_PROMPTS`

```bash
# Colon-separated paths (like PATH)
QWEN_LYRA_INIT_PROMPTS="~/prism/axes.md:~/prism/broken_stone.md" qwen-lyra -y "observe"
```

### 3. Merge Order

Settings → Env Var → CLI flags (later entries append, never override)

```
finalInitPrompts = [
  ...settings.context.globalInitPrompts,
  ...QWEN_LYRA_INIT_PROMPTS.split(':'),
  ...cliFlags
]
```

## Implementation

### A. CLI Argument Parsing

**File:** `packages/cli/src/cli.ts` (or wherever argv parsing happens)

Add `--init-prompt` as a repeatable string option:
```typescript
.option('--init-prompt <path>', 'Add file to global init prompts (repeatable)')
```

Pass the array to `ConfigParameters`:
```typescript
initPromptsFromCli: argv.initPrompt  // string[] | undefined
```

### B. Config Integration

**File:** `packages/core/src/config/config.ts`

Update `ConfigParameters`:
```typescript
interface ConfigParameters {
  // ... existing
  globalInitPrompts?: string[];      // from settings.json
  initPromptsFromEnv?: string[];     // from QWEN_LYRA_INIT_PROMPTS
  initPromptsFromCli?: string[];     // from --init-prompt flags
}
```

Update `getGlobalInitPrompts()` to merge all three sources:
```typescript
getGlobalInitPrompts(): string {
  const allPaths = [
    ...this.globalInitPrompts,
    ...this.initPromptsFromEnv ?? [],
    ...this.initPromptsFromCli ?? [],
  ];
  // ... existing read + concatenate logic
}
```

### C. Env Var Parsing

**File:** `packages/cli/index.ts` (where `QWEN_HOME` is set)

Add:
```typescript
if (process.env['QWEN_LYRA_INIT_PROMPTS']) {
  configParams.initPromptsFromEnv = process.env['QWEN_LYRA_INIT_PROMPTS'].split(':');
}
```

### D. Prism Script Update

**File:** `scripts/qwen-lyra-prism.sh`

Simplify to:
```bash
exec qwen-lyra \
  --init-prompt "$PRISM_DIR/tension.md" \
  --init-prompt "$PRISM_DIR/refraction.md" \
  -y "$prompt"
```

No longer depends on `globalInitPrompts` in settings.json for its operation.

## Testing

### Unit Tests

- `config.test.ts`: Test merge order (settings + env + cli)
- `config.test.ts`: Test CLI flag paths with tilde expansion
- `config.test.ts`: Test empty CLI flags falls back to settings only

### Integration Tests

- Launch session with `--init-prompt /tmp/test-init.md`
- Verify content appears in system instruction
- Test env var `QWEN_LYRA_INIT_PROMPTS` works

## Risks

- **Flag explosion:** Too many CLI flags clutter the interface. Mitigate: `--init-prompt` is the only new flag; it's a natural extension of the existing settings.
- **Security:** Arbitrary file reads via CLI flag. Mitigate: same risk as `settings.json` paths — the user is already trusted to configure these.

## Open Questions

- Should `--init-prompt` paths be validated at startup (file must exist) or silently skipped like settings.json paths?
- Should there be a `--no-init-prompts` flag to temporarily disable settings.json prompts?
