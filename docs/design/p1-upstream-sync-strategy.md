# Design Spec: Upstream Sync Strategy (P1)

**Status:** Draft  
**Priority:** HIGH  
**Depends on:** None  
**Blocks:** Long-term fork viability

---

## Problem

The `lyra` branch deep-renamed `qwen-code` → `qwen-lyra` across ~40 files (package names, binary names, installation scripts, env vars, directory paths). Every upstream change to `package.json`, `scripts/`, or binary references will cause merge conflicts. Without a systematic sync strategy, the fork will diverge and rot.

## Current State

- `lyra` branch: 4 commits ahead of `main`
- Rename mapping applied: `qwen-code` → `qwen-lyra`, `qwen` (binary) → `qwen-lyra`, `QWEN_HOME` → `~/.qwen-lyra`
- No documented sync process
- No automated conflict resolution

## Rename Mapping (Exhaustive)

| Upstream (qwen-code) | Lyra fork | Context |
|---|---|---|
| `@qwen-code/qwen-code` | `@qwen-code/qwen-lyra` | package.json name |
| `qwen` (bin) | `qwen-lyra` | binary entry |
| `~/.qwen` | `~/.qwen-lyra` | config/memory home |
| `QWEN_HOME` | `QWEN_HOME` (redirected) | env var — same key, different default |
| `qwen-code` in archive names | `qwen-lyra` | installation scripts |
| `qwen-code` in source.json paths | `qwen-lyra` | installation scripts |

## Proposed Solution

### Script: `scripts/sync-upstream.sh`

A semi-automated rebase helper that:

1. **Fetch upstream** — `git fetch origin main`
2. **Create sync branch** — `git checkout -b sync-upstream-$(date +%Y%m%d) lyra`
3. **Attempt rebase** — `git rebase origin/main`
4. **Auto-resolve known conflicts** — Apply rename mapping to conflicted files:
   - If conflict is in a rename-eligible file (`package.json`, `scripts/`, `*.sh`), apply sed substitution
   - `s/qwen-code/qwen-lyra/g` and `s/"qwen"/"qwen-lyra"/g` (with context awareness)
5. **Verify** — Run `npm run build && npm run typecheck`
6. **Report** — If conflicts remain after auto-resolve, list them with file + line
7. **Finish** — If clean: commit message `chore: sync upstream main@<sha>`. If dirty: leave branch for manual resolution.

### Conflict Resolution Templates

```bash
# Known safe substitutions (applied only to our renamed files)
RENAME_PATTERNS=(
  's/@qwen-code\/qwen-code/@qwen-code\/qwen-lyra/g'
  's/"qwen"/"qwen-lyra"/g'          # binary name in package.json
  's/~\/\.qwen\//~\/.qwen-lyra\//g'  # home directory references
  's/qwen-code-/qwen-lyra-/g'        # archive names
  's/qwen-code\.json/qwen-lyra.json/g' # source.json
)

# Files where rename should be applied (not upstream-only files)
RENAME_FILES=(
  'package.json'
  'packages/*/package.json'
  'scripts/**/*.sh'
  'scripts/**/*.js'
  'scripts/**/*.md'
)
```

### Safety Measures

- `--dry-run` mode: show what would be rebased and which conflicts are expected
- `--no-auto-resolve`: skip automatic sed, report all conflicts raw
- Never auto-resolve `packages/core/src/**` or `packages/cli/src/**` — these need human review
- Always run build + typecheck after rebase
- Never force-push

## Usage

```bash
# Full sync with auto-resolve
./scripts/sync-upstream.sh

# Dry run — see what would happen
./scripts/sync-upstream.sh --dry-run

# Manual review mode — no auto-resolve
./scripts/sync-upstream.sh --no-auto-resolve
```

## Risks

- **False positive auto-resolve:** sed might rename something that upstream intentionally changed. Template matching reduces this risk but doesn't eliminate it.
- **Semantic conflicts:** Upstream may refactor the same code we modified (e.g., config system). Auto-resolve can't handle logic changes — only name changes.

## Testing

- Test against a known upstream change (e.g., the next upstream commit)
- Verify that `sync-upstream.sh --dry-run` correctly predicts conflicts
- Verify that after auto-resolve, `npm run build && npm run typecheck` passes

## Open Questions

- Should we maintain a `lyra-base` branch (last clean rebase point) for easier rollback?
- Should the script also handle `package-lock.json` rename entries?
