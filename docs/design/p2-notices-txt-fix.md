# Design Spec: NOTICES.txt Bug Fix (P2)

**Status:** Draft  
**Priority:** LOW (quick win)  
**Depends on:** None  
**Blocks:** Clean distribution

---

## Problem

VSCode companion `NOTICES.txt` contains a broken entry:
```
@qwen-code/sdk@undefined — License text not found.
```

This is a build artifact bug where the SDK version resolves to `undefined` during notices generation.

## Root Cause Analysis

The notices script (`scripts/notices.js` or equivalent) reads package versions to generate the attribution list. The `@qwen-code/sdk` package likely has a version resolution issue — either:

1. The package version is not set correctly in `packages/sdk/package.json`
2. The notices script reads version from the wrong location
3. The rename from `qwen-code` to `qwen-lyra` broke a path reference in the notices generator

## Proposed Fix

1. **Locate** the notices generation script
2. **Identify** why `@qwen-code/sdk` version resolves to `undefined`
3. **Fix** the version resolution
4. **Regenerate** `NOTICES.txt`
5. **Verify** no other `@undefined` entries exist

## Steps

```bash
# 1. Find the notices script
grep -r "NOTICES" scripts/ package.json

# 2. Check SDK package version
cat packages/sdk/package.json | grep version

# 3. Run notices regeneration
npm run notices  # or whatever the command is

# 4. Verify
grep "undefined" packages/vscode-ide-companion/NOTICES.txt
```

## Testing

- `grep "undefined" packages/vscode-ide-companion/NOTICES.txt` returns nothing
- All entries have valid version numbers
- Build still passes

## Effort

Trivial — likely a 1-line fix + regeneration.
