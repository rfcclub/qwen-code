# Qwen-Lyra Improvement Suggestions

*Generated: 2026-05-24 by Lyra*

---

## Priority Fixes (Ordered by Risk)

### P1 — Upstream Sync Strategy (Risk: HIGH)

**Problem:** Deep rename of `qwen-code` → `qwen-lyra` means almost every upstream change to `package.json`, installation scripts, and binary names will cause merge conflicts. No documented process for pulling upstream changes.

**Impact:** Without a strategy, the fork will rot within weeks. Each upstream merge becomes a manual conflict-resolution marathon.

**Proposed:** Create a sync helper script that:
- Rebases `lyra` onto `main` automatically
- Identifies rename-conflict patterns and applies resolution templates
- Documents the rename mapping (`qwen-code` → `qwen-lyra`, `qwen` → `qwen-lyra`, etc.)
- Runs build + typecheck after rebase to verify

---

### P2 — NOTICES.txt Bug (Risk: LOW but dirty)

**Problem:** `@qwen-code/sdk@undefined` appears in VSCode companion `NOTICES.txt` with "License text not found." This is a build artifact bug, not intentional.

**Impact:** Noise in legal notices. Could cause issues if distribution requires clean notices.

**Proposed:** Regenerate NOTICES after fixing the SDK version resolution in the notices script.

---

### P3 — `--init-prompt` CLI Flag (Risk: MEDIUM)

**Problem:** `globalInitPrompts` only configurable via `settings.json`. No CLI flag or env var for ad-hoc prompt injection.

**Impact:** Automation scripts (like `qwen-lyra-prism.sh`) and multi-identity workflows require editing settings.json each time. No way to do one-off prompt injection.

**Proposed:** Add `--init-prompt <path>` CLI flag and `QWEN_LYRA_INIT_PROMPTS` env var that append to (or override) `settings.json` globalInitPrompts.

---

### P4 — `globalInitPrompts` Cache Invalidation (Risk: LOW)

**Problem:** `globalInitPromptsContent` is cached for the session lifetime. If a file is updated mid-session, the change is not picked up.

**Impact:** During identity file iteration (common in development), users must restart the session to see changes. Not documented.

**Proposed:** Add file-watching or mtime-based invalidation. Document the caching behavior.

---

### P5 — Integration Tests for Lyra Features (Risk: MEDIUM)

**Problem:** `globalInitPrompts` has unit tests but no integration/E2E tests verifying the prompts actually appear in the system instruction sent to the model. Prism script has no tests.

**Impact:** Refactors could break the feature silently. No confidence that system prompt injection works end-to-end.

**Proposed:** Add integration test that:
- Sets `globalInitPrompts` in settings
- Launches a session
- Verifies the prompt content appears in the system instruction
- Tests the prism script invocation

---

### P6 — Prism Script Hardcoded Paths (Risk: LOW)

**Problem:** `qwen-lyra-prism.sh` defaults to `$HOME/agora/hive/prism/current/` — specific to colony setup. Won't work for other users.

**Impact:** Script is not portable. Requires manual path overrides.

**Proposed:** Make paths configurable via env vars or CLI args with sensible defaults.

---

## Feature Ideas

### A — `--init-prompt` CLI Flag

(Overlaps with P3 — same item)

Add `--init-prompt <path>` and `QWEN_LYRA_INIT_PROMPTS` env var for ad-hoc prompt injection without editing settings.json.

**Use cases:**
- Prism script: `qwen-lyra --init-prompt ~/prism/axes.md --init-prompt ~/prism/broken_stone.md -y "observe the colony"`
- Multi-identity: different prompt sets for different agents without changing global settings
- CI/testing: inject test prompts without modifying config

---

### B — Upstream Sync Helper Script

(Overlaps with P1 — same item)

A script (`scripts/sync-upstream.sh`) that:
1. Fetches upstream `main`
2. Creates a temp rebase branch
3. Applies rename-resolution patterns
4. Runs build + typecheck
5. Reports conflicts that need manual resolution
6. Optionally auto-commits if clean

---

### C — Identity Profiles

Allow switching between multiple `globalInitPrompts` sets:
- `qwen-lyra --profile lyra` → loads `~/.qwen-lyra/profiles/lyra.json`
- `qwen-lyra --profile aria` → loads `~/.qwen-lyra/profiles/aria.json`
- Each profile defines its own `globalInitPrompts` array + optional `appendSystemPrompt`

**Why:** Multi-agent colony uses the same CLI install but different identity configurations.

---

### D — Hot-Reload `globalInitPrompts`

(Overlaps with P4 — same item)

Watch `globalInitPrompts` files for changes during a session and invalidate the cache when mtime changes.

**Why:** Dev workflow — iterate on identity files without restarting sessions.

---

## Implementation Order (Recommended)

| Phase | Items | Rationale |
|-------|-------|-----------|
| 1 | P2 (NOTICES fix) | Quick win, clears noise |
| 2 | P3 / A (`--init-prompt`) | Unblocks automation, highest feature value |
| 3 | P1 / B (upstream sync) | Protects the fork from rot |
| 4 | P5 (integration tests) | Safety net before more changes |
| 5 | P4 / D (cache invalidation) | Quality-of-life for dev workflow |
| 6 | P6 (prism script paths) | Portability |
| 7 | C (identity profiles) | Depends on `--init-prompt` being done first |
