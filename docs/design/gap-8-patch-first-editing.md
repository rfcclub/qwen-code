# Design: Patch-First Editing + Semantic Merge

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

Current edit tool (`edit`) in qwen-lyra:

- Replaces text by exact match (old_string → new_string)
- Full-file rewrites for large changes
- No fallback when exact match fails

Issues:

- Small models struggle with exact string matching
- Full rewrites waste tokens
- Failed patches are hard errors

Competitor: SmallCode patch-first with semantic merge fallback.

---

## Solution

Promote patch-based editing as primary primitive, with semantic merge fallback.

---

## Components

### 1. Patch Tool

```typescript
interface Patch {
  type: 'replace' | 'insert' | 'delete';
  search: string; // text to find (exact or fuzzy)
  replace?: string; // replacement text
  lineRange?: {
    // optional: constrain to line range
    start: number;
    end: number;
  };
  fuzzy?: boolean; // allow whitespace/variable name differences
}

interface PatchResult {
  applied: boolean;
  patchesApplied: number;
  patchesFailed: number;
  conflicts?: PatchConflict[];
}

class PatchTool {
  apply(filePath: string, patches: Patch[]): PatchResult;
  // Tries exact match first, then fuzzy match, then line range
}
```

**Example patch:**

```json
{
  "tool": "patch",
  "params": {
    "filePath": "src/utils.ts",
    "patches": [
      {
        "type": "replace",
        "search": "function sort(items: string[]): string[] {\n  return items.sort();\n}",
        "replace": "function sort<T>(items: T[]): T[] {\n  return [...items].sort();\n}",
        "fuzzy": true
      }
    ]
  }
}
```

---

### 2. Fuzzy Matching

Tolerate minor differences:

```typescript
function fuzzyMatch(search: string, content: string): Match | null {
  // Normalize: strip trailing whitespace, normalize line endings
  const normalizedSearch = normalize(search);
  const normalizedContent = normalize(content);

  // Exact match
  if (normalizedContent.includes(normalizedSearch)) {
    return { exact: true, position };
  }

  // Levenshtein distance (for minor typos/renaming)
  const bestMatch = findBestLevenshteinMatch(
    normalizedSearch,
    normalizedContent,
  );
  if (bestMatch.distance < threshold) {
    return {
      exact: false,
      position: bestMatch.position,
      confidence: bestMatch.score,
    };
  }

  return null;
}
```

**Thresholds:**

- Exact match: confidence 1.0
- Fuzzy match with distance < 10%: confidence 0.8
- Fuzzy match with distance < 20%: confidence 0.5 (warn user)

---

### 3. Multi-Line Patches

Support patches that span multiple non-contiguous sections:

```typescript
interface MultiPatch {
  patches: Patch[];
  strategy: 'sequential' | 'parallel'; // apply in order or all at once
}

// Sequential: each patch applied to result of previous
// Parallel: all patches applied to original, then merged
```

---

### 4. Semantic Merge

When patch fails, ask model to merge intended change into current content:

```typescript
class SemanticMerge {
  async merge(
    originalContent: string,
    intendedPatch: Patch,
    currentContent: string, // file may have changed since read
  ): Promise<string> {
    // Ask model: "Given original, intended change, and current content,
    // produce merged result that applies the intent to current content"
    const prompt = buildMergePrompt(
      originalContent,
      intendedPatch,
      currentContent,
    );
    const merged = await llm.generate(prompt);
    return merged;
  }
}
```

**Fallback chain:**

1. Exact patch
2. Fuzzy patch
3. Semantic merge (LLM-based)
4. Full rewrite (last resort)

---

### 5. Diff Preview

Before applying, show preview:

```
┌─ Patch Preview ──────────────────────────────┐
│ File: src/utils.ts                            │
│                                               │
│ @@ -42,5 +42,5 @@                             │
│  function sort(items: string[]): string[] {   │
│ -  return items.sort();                       │
│ +  return [...items].sort();                  │
│  }                                            │
│                                               │
│ [Y] Apply  [N] Skip  [E] Edit  [A] All        │
└───────────────────────────────────────────────┘
```

---

### 6. Configuration

```json
{
  "editing": {
    "mode": "patch-first", // or "full-rewrite" for frontier models
    "fuzzyMatching": true,
    "semanticMerge": true,
    "autoApplyThreshold": 0.9, // auto-apply if confidence > 0.9
    "confirmThreshold": 0.5 // confirm if confidence < 0.5
  }
}
```

---

## Files to Modify

- `packages/core/src/tools/edit.ts` → enhance with fuzzy + semantic merge
- `packages/core/src/tools/patch.ts` → new patch tool (or extend edit)
- `packages/cli/src/ui/` → diff preview UI

---

## Success Metrics

- Patch success rate (exact): target 80%+
- Patch success rate (with fuzzy): target 90%+
- Patch success rate (with semantic merge): target 95%+
- Token usage reduction vs full rewrites: target 60%+
- Time to apply patch: target <100ms

---

## References

- SmallCode: `~/repo/smallcode` patch and semantic merge implementation
