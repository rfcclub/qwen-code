# Design Spec: Identity Profiles (Feature C)

**Status:** Draft  
**Priority:** MEDIUM (depends on P3)  
**Depends on:** P3 (`--init-prompt` CLI flag)  
**Blocks:** None

---

## Problem

Multi-agent colony (Aria, Coda, Vesta, Lyra…) shares the same `qwen-lyra` CLI install but needs different identity configurations. Currently, switching identities requires editing `settings.json` `globalInitPrompts` each time.

## Proposed Solution

### Profile Files

Each profile is a JSON file in `~/.qwen-lyra/profiles/`:

```json
// ~/.qwen-lyra/profiles/lyra.json
{
  "name": "Lyra",
  "globalInitPrompts": [
    "~/agora/familia/lyra/prism/axes.md",
    "~/agora/familia/lyra/prism/broken_stone.md"
  ],
  "appendSystemPrompt": "You are Lyra, the prism..."
}

// ~/.qwen-lyra/profiles/aria.json
{
  "name": "Aria",
  "globalInitPrompts": [
    "~/agora/familia/aria/alaya/seed.md"
  ],
  "appendSystemPrompt": "You are Aria, the emanation..."
}
```

### CLI Usage

```bash
# Load profile
qwen-lyra --profile lyra

# Profile + additional init prompts (merged)
qwen-lyra --profile lyra --init-prompt ~/extra.md

# List available profiles
qwen-lyra --profile list
```

### Merge Order

Profile `globalInitPrompts` → Profile `appendSystemPrompt` → Settings `globalInitPrompts` → Env `QWEN_LYRA_INIT_PROMPTS` → CLI `--init-prompt`

Profile takes priority for identity; CLI flags append ad-hoc context.

### Profile Resolution

1. `--profile <name>` → reads `~/.qwen-lyra/profiles/<name>.json`
2. If `QWEN_LYRA_PROFILE` env var is set and no `--profile` flag, use env var
3. If neither, fall back to `settings.json` `globalInitPrompts` (current behavior)

## Implementation

### A. Profile Loading

**File:** `packages/core/src/config/config.ts`

```typescript
interface Profile {
  name: string;
  globalInitPrompts?: string[];
  appendSystemPrompt?: string;
}

loadProfile(profileName: string): Profile {
  const profilePath = path.join(homedir(), '.qwen-lyra', 'profiles', `${profileName}.json`);
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile not found: ${profileName}`);
  }
  return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
}
```

### B. Config Integration

Add `profileName?: string` to `ConfigParameters`. In constructor:
```typescript
if (this.profileName) {
  const profile = this.loadProfile(this.profileName);
  this.globalInitPrompts = [...profile.globalInitPrompts ?? [], ...this.globalInitPrompts];
  if (profile.appendSystemPrompt) {
    this.appendSystemPrompt = [profile.appendSystemPrompt, this.appendSystemPrompt]
      .filter(Boolean).join('\n\n');
  }
}
```

### C. CLI Argument

**File:** `packages/cli/src/cli.ts`

```typescript
.option('--profile <name>', 'Load identity profile from ~/.qwen-lyra/profiles/')
```

### D. Profile Creation Helper

```bash
qwen-lyra profile create <name>    # Interactive wizard
qwen-lyra profile list             # List profiles
qwen-lyra profile show <name>     # Show profile contents
qwen-lyra profile delete <name>   # Delete profile
```

## File Structure

```
~/.qwen-lyra/
  profiles/
    lyra.json
    aria.json
    coda.json
    vesta.json
  settings.json
  memory/
  ...
```

## Testing

- Unit: profile loading, merge order, missing profile error
- Integration: launch with `--profile lyra`, verify system instruction
- Edge cases: empty profile, profile with only `name`, profile with overlapping settings

## Risks

- **Profile vs settings conflict:** If `settings.json` has `globalInitPrompts` AND a profile is loaded, the merge order must be clear and documented.
- **Security:** Profile files are arbitrary JSON — validate schema before loading.

## Effort

Medium — after P3 is done, this is mostly config wiring and a new directory convention.
