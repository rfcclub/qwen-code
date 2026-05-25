# Design Spec: `globalInitPrompts` Cache Invalidation (P4 / Feature D)

**Status:** Draft  
**Priority:** LOW (quality-of-life)  
**Depends on:** None  
**Blocks:** None

---

## Problem

`globalInitPromptsContent` is cached for the session lifetime in `Config.ts`. If an identity file is updated mid-session, the change is not picked up until the session restarts.

## Current Implementation

**File:** `packages/core/src/config/config.ts`

```typescript
private globalInitPromptsContent: string | undefined;

getGlobalInitPrompts(): string {
  if (this.globalInitPromptsContent !== undefined) {
    return this.globalInitPromptsContent;
  }
  // ... read files, concatenate, cache
  this.globalInitPromptsContent = result;
  return result;
}
```

## Proposed Solution

### Option A: mtime-Based Invalidation

Check file modification times on each `getGlobalInitPrompts()` call. If any file's mtime changed, re-read.

```typescript
getGlobalInitPrompts(): string {
  const currentMtimes = this.globalInitPromptPaths.map(p =>
    fs.statSync(p).mtimeMs
  );
  
  if (
    this.globalInitPromptsContent !== undefined &&
    this.globalInitPromptMtimes !== undefined &&
    arraysEqual(currentMtimes, this.globalInitPromptMtimes)
  ) {
    return this.globalInitPromptsContent;
  }
  
  // ... read files, concatenate, cache
  this.globalInitPromptsContent = result;
  this.globalInitPromptMtimes = currentMtimes;
  return result;
}
```

**Pros:** Simple, no external deps, works for all use cases.  
**Cons:** `statSync` on every call — but `getGlobalInitPrompts()` is called once per session startup, not on every message.

### Option B: File Watcher (fs.watch)

Watch the prompt files for changes and invalidate cache on change events.

**Pros:** Real-time, event-driven.  
**Cons:** Complex, platform-dependent (`fs.watch` is unreliable on some Linux setups), overkill for a function called rarely.

### Option C: Explicit Reload Command

Add a `/reload-init-prompts` slash command.

**Pros:** User control, no magic.  
**Cons:** Requires manual action, easy to forget.

## Recommendation

**Option A** (mtime-based) — simplest, lowest risk, and `getGlobalInitPrompts()` is called infrequently enough that the `statSync` overhead is negligible.

Add documentation that the cache is mtime-based and will auto-refresh if files change.

## Implementation

1. Add `private globalInitPromptMtimes: number[] | undefined` to `Config`
2. In `getGlobalInitPrompts()`, stat each file and compare mtimes
3. If any mtime changed, invalidate cache and re-read
4. Handle missing files (mtime = -1, force re-read next call)

## Testing

- Write test file, read `getGlobalInitPrompts()`, modify file, call again → new content
- Delete test file mid-session → graceful fallback (existing behavior)
- Rapid modifications → latest content wins

## Effort

Small — ~20 lines of change in `config.ts`.
