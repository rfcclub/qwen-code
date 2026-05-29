# Design: Small-Model Optimization Layer

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

Qwen-lyra assumes frontier models (Claude 3.5 Sonnet, GPT-4, Qwen-Max). Users running Qwen 7B/14B locally experience:

- Context overflow (small context windows)
- Failed tool calls (models output malformed JSON/XML)
- Full-file rewrites wasting tokens
- Repeated mistakes across sessions (no learning)
- Task drift (no plan anchoring)

## Solution

Build a "Compensating Infrastructure" layer that makes small models (8B-35B) viable.

---

## Components

### 1. Token Budget Engine

**Purpose:** Never exceed context window. Enforce strict token accounting.

**Design:**

```typescript
interface TokenBudget {
  maxTokens: number; // e.g. 32768 for Qwen 14B
  reservedForResponse: number; // ~4096 tokens
  reservedForTools: number; // ~4096 tokens
  availableForContext: number; // computed
}

class TokenBudgetManager {
  computeBudget(model: string, contextWindow: number): TokenBudget;
  enforceBudget(messages: Message[], budget: TokenBudget): Message[];
  midTurnEviction(messages: Message[], required: number): Message[];
}
```

**Rules:**

- Cap tool results at 4k characters
- Evict oldest messages when approaching limit
- Prioritize system prompt + recent user messages + active TODOs
- Semantic compression: summarize evicted messages into 1-line summaries

---

### 2. Forgiving Tool Parser

**Purpose:** Parse tool calls from models that output malformed JSON.

**Supported formats:** JSON, YAML, XML, Hermes, plain text

**Design:**

```typescript
interface ParsedToolCall {
  toolName: string;
  params: Record<string, unknown>;
  confidence: number; // 0-1, based on parse quality
}

class ForgivingToolParser {
  parse(input: string): ParsedToolCall[];
  // Tries JSON first, then YAML, then XML, then regex extraction
  // Auto-repairs: fixes missing quotes, trailing commas, unclosed brackets
}
```

**Repair rules:**

- Missing closing brace? Add it.
- Trailing comma? Remove it.
- YAML instead of JSON? Convert.
- Plain text like "search for X"? Map to `grep_search` tool.

---

### 3. Patch-First Editing

**Purpose:** Use search-and-replace as primary edit primitive instead of full rewrites.

**Design:**

```typescript
interface PatchOperation {
  type: 'replace' | 'insert' | 'delete';
  search: string; // exact or fuzzy match
  replace: string;
  lineRange?: { start: number; end: number };
}

class PatchEngine {
  apply(filePath: string, patches: PatchOperation[]): Result;
  // Fuzzy matching: tolerate whitespace differences, variable renaming
  // Multi-line patch support
  // Fallback to full rewrite if patch fails
}
```

**Why safer:**

- Model only edits what it sees
- Reduces token usage (patch < full file)
- Easier to review (diff vs full file)

---

### 4. TODO-Driven Planning

**Purpose:** Anchor complex tasks with atomic steps.

**Design:**

```typescript
interface Todo {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  evidence?: string; // what was tried
}

class TodoPlanner {
  createPlan(task: string): Todo[];
  injectIntoContext(todos: Todo[], messages: Message[]): Message[];
  // Each turn, model sees current TODO state
  // Prevents task drift
}
```

**Rules:**

- Plan emitted first ("Numbered plan"), then re-injected as anchor
- Complex tasks auto-decomposed
- Model reads TODO file each turn
- Done items stay visible (prevents redo)

---

### 5. Tool Deduplication

**Purpose:** Short-circuit identical read-only tool calls.

**Design:**

```typescript
class ToolDeduplicator {
  private callWindow: Map<string, ToolResult>; // sliding window

  shouldExecute(call: ToolCall): boolean {
    const key = hashCall(call);
    if (this.callWindow.has(key) && isReadOnly(call)) {
      return false; // return cached result
    }
    return true;
  }
}
```

**Window size:** Last 20 calls or last 5 turns, whichever is smaller.

---

### 6. Context-Aware Read Guard

**Purpose:** Replace dumb truncation with intelligent content selection.

**Design:**

```typescript
class ReadGuard {
  readFile(filePath: string, budget: number): string {
    const content = fs.readFileSync(filePath);
    if (content.length < budget) return content;

    // Intelligent: head + tail + section markers
    const head = content.slice(0, budget * 0.3);
    const tail = content.slice(-budget * 0.3);
    return `${head}\n\n... [${content.length - budget * 0.6} chars omitted] ...\n\n${tail}`;
  }
}
```

**Also:** Directive-aware (if file contains "# Section: X", preserve section headers).

---

### 7. Read-Before-Write Guard

**Purpose:** Prevent overwriting files the model hasn't read.

**Design:**

```typescript
class ReadBeforeWriteGuard {
  private readFiles: Set<string> = new Set();

  canWrite(filePath: string): boolean {
    return this.readFiles.has(filePath);
  }

  registerRead(filePath: string): void {
    this.readFiles.add(filePath);
  }
}
```

**Override:** User can force write with `--danger` flag.

---

### 8. Quality Monitor

**Purpose:** Catch model mistakes automatically.

**Checks:**

- Empty tool calls (no output)
- Hallucinated tool names (not in schema)
- Exact-repeat calls (same args, same result)
- Infinite loops (>5 identical calls)
- Syntax errors in generated code

**Design:**

```typescript
class QualityMonitor {
  checkTurn(turn: Turn): QualityIssue[];
  // Returns issues with severity + suggested fix
}
```

---

### 9. Adaptive Retry Temperature

**Purpose:** Vary temperature per retry attempt.

**Design:**

```typescript
function getRetryTemperature(attempt: number): number {
  // Attempt 1: 0.1 (deterministic)
  // Attempt 2: 0.5 (balanced)
  // Attempt 3: 0.9 (creative)
  return Math.min(0.1 + attempt * 0.4, 1.0);
}
```

---

### 10. Per-Tool Trust Score Decay

**Purpose:** Drop tools that fail repeatedly.

**Design:**

```typescript
interface ToolTrust {
  toolName: string;
  successCount: number;
  failCount: number;
  lastFailure?: string;
  disabled: boolean;
}

class ToolTrustManager {
  recordResult(toolName: string, success: boolean): void;
  getAvailableTools(): string[]; // excludes disabled
  // Threshold: disable after 3 failures in a row
}
```

---

## Integration Points

- **Config:** `smallModelOptimization: true` in settings.json
- **Model detection:** Auto-enable when context window < 32k or parameter count < 35B
- **Override:** `--no-small-model-optimization` flag
- **UI:** Status line indicator (🐇 for small mode, 🚀 for frontier mode)

---

## Success Metrics

- Qwen 7B pass rate on smoke tests: target 70%+
- Qwen 14B pass rate on smoke tests: target 85%+
- Token usage reduction vs full rewrites: target 50%+
- Context overflow incidents: target 0

---

## Files to Modify

- `packages/core/src/core/client.ts` — inject compensating layer
- `packages/core/src/tools/patch.ts` — new patch tool
- `packages/core/src/small-model/` — new package or directory
- `packages/cli/src/ui/` — status line indicator

---

## References

- SmallCode: `~/repo/smallcode` — full implementation reference
