# Small-Model Optimization — Technical Design

## Architecture

The compensating infrastructure is a **transparent middleware layer** between the agent loop and the LLM provider:

```
Agent Loop
  │
  ├─→ Pre-Request Pipeline
  │    ├─ 1. TODO Plan Injection (inject current plan into last user message)
  │    ├─ 2. Token Budget Enforcement (evict if needed)
  │    └─ 3. Context-Aware Read Guard (truncate file reads)
  │
  ├─→ LLM Provider
  │
  └─→ Post-Response Pipeline
       ├─ 4. Quality Monitor (check for issues)
       ├─ 5. Forgiving Tool Parser (parse tool calls)
       ├─ 6. Tool Deduplication (cache read-only calls)
       ├─ 7. Read-Before-Write Guard (block unread file edits)
       ├─ 8. Adaptive Retry Temperature (adjust for retries)
       └─ 9. Per-Tool Trust Decay (track tool reliability)
```

The layer is **configurable**: enabled by default for models with <32K context or <35B parameters, disableable via `--no-small-model-optimization` flag or `smallModelOptimization: false` in config.

## Module Structure

```
packages/core/src/small-model/
├── index.ts                 # exports all components, factory function
├── budget.ts                # TokenBudgetManager
├── parser.ts                # ForgivingToolParser
├── patch.ts                 # PatchEngine
├── plan.ts                  # TodoPlanner
├── dedup.ts                 # ToolDeduplicator
├── read-guard.ts            # ReadGuard + ReadBeforeWriteGuard
├── quality.ts               # QualityMonitor
├── retry.ts                 # AdaptiveRetryTemperature
├── trust.ts                 # ToolTrustManager
└── types.ts                 # shared interfaces
```

## Component Details

### 1. TokenBudgetManager (`budget.ts`)

```typescript
class TokenBudgetManager {
  private modelMaxTokens: number;
  private reservedForResponse = 4096;
  private reservedForTools = 4096;

  constructor(modelMaxTokens: number) {
    this.modelMaxTokens = modelMaxTokens;
  }

  getAvailableContext(): number {
    return (
      this.modelMaxTokens - this.reservedForResponse - this.reservedForTools
    );
  }

  evictIfNeeded(messages: Message[]): Message[] {
    const budget = this.getAvailableContext();
    const current = this.estimateTokenCount(messages);
    if (current <= budget) return messages;
    return this.compactMessages(messages, current - budget);
  }

  private compactMessages(
    messages: Message[],
    excessTokens: number,
  ): Message[] {
    // Keep last 5 turns intact
    // Evict oldest, summarize as: "[Previous conversation: {user intent} → {action} → {result}]"
    // Continue evicting until estimated tokens fit within budget
  }

  private estimateTokenCount(messages: Message[]): number {
    // Rough estimate: 1 token ≈ 4 characters
    return messages.reduce((sum, m) => sum + m.content.length / 4, 0);
  }
}
```

### 2. ForgivingToolParser (`parser.ts`)

```typescript
class ForgivingToolParser {
  parse(input: string): ParsedToolCall[] {
    // Strategy chain:
    // 1. Try JSON.parse (strict)
    // 2. Try JSON.parse (repaired — trailing commas, missing brackets)
    // 3. Try YAML.parse
    // 4. Try XML parse (<function> <name>...</name> <param name="...">...</param>)
    // 5. Try regex extraction from plain text ("search for X" → grep_search)
    // 6. If all fail, return empty (quality monitor catches this)
    // Repair step:
    // - Remove trailing commas before ]
    // - Remove trailing commas before }
    // - Add missing closing brackets
    // - Handle unterminated strings (close with " or ')
  }

  private extractToolName(input: string): string | null {
    // Map common phrases to tool names
    const phrases: Record<string, string> = {
      'search for': 'grep_search',
      find: 'grep_search',
      read: 'read_file',
      edit: 'write_file',
      create: 'write_file',
      run: 'run_shell_command',
      execute: 'run_shell_command',
    };
    // ...
  }
}
```

### 3. PatchEngine (`patch.ts`)

```typescript
class PatchEngine {
  apply(filePath: string, patches: Patch[]): PatchResult {
    const content = fs.readFileSync(filePath, 'utf-8');
    let current = content;
    const results: PatchOperation & { success: boolean; confidence: number }[] =
      [];

    for (const patch of patches) {
      const result = this.applyPatch(current, patch);
      if (result.success) {
        current = result.content;
      }
      results.push(result);
    }

    fs.writeFileSync(filePath, current);
    return {
      applied: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  }

  private applyPatch(
    content: string,
    patch: Patch,
  ): { success: boolean; content: string; confidence: number } {
    // 1. Try exact match (confidence: 1.0)
    const exact = content.indexOf(patch.search);
    if (exact >= 0) {
      return {
        success: true,
        content:
          content.slice(0, exact) +
          patch.replace +
          content.slice(exact + patch.search.length),
        confidence: 1.0,
      };
    }

    // 2. Try fuzzy match (normalize whitespace, line endings)
    const fuzzy = this.findFuzzyMatch(content, patch.search);
    if (fuzzy) {
      return {
        success: true,
        content:
          content.slice(0, fuzzy.pos) +
          patch.replace +
          content.slice(fuzzy.pos + fuzzy.matchLen),
        confidence: 0.8,
      };
    }

    // 3. Try line-range constrained match
    if (patch.lineRange) {
      return this.applyLineRange(content, patch);
    }

    return { success: false, content, confidence: 0 };
  }
}
```

### 4. TodoPlanner (`plan.ts`)

```typescript
class TodoPlanner {
  private todos: Todo[] = [];

  // Called when user gives a complex task
  injectIntoPlan(todos: Todo[]): void {
    this.todos = todos.map((t) => ({ ...t, status: 'pending' }));
  }

  // Called each turn to get current TODO context
  getTodoContext(): string {
    return this.todos
      .map(
        (t, i) =>
          `${i + 1}. [${t.status === 'done' ? 'x' : t.status === 'failed' ? '!' : ' '}] ${t.description}`,
      )
      .join('\n');
  }

  // Check for stuck steps
  checkStuck(): Todo | null {
    // If any step has been in_progress for >5 turns, flag it
  }
}
```

### 5. ToolDeduplicator (`dedup.ts`)

```typescript
class ToolDeduplicator {
  private cache: Map<string, { result: any; calls: number }> = new Map();
  private windowSize = 20;
  private window: string[] = [];

  shouldExecute(toolName: string, params: any): boolean {
    const key = `${toolName}:${JSON.stringify(normalizeParams(params))}`;

    if (this.isReadOnlyTool(toolName) && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.calls++;
      return false; // return cached result
    }

    this.window.push(key);
    if (this.window.length > this.windowSize) {
      const oldest = this.window.shift()!;
      this.cache.delete(oldest);
    }

    return true;
  }

  private isReadOnlyTool(name: string): boolean {
    return [
      'read_file',
      'grep_search',
      'glob',
      'ls',
      'git_log',
      'git_status',
    ].includes(name);
  }
}
```

### 6. ReadGuard + ReadBeforeWriteGuard (`read-guard.ts`)

```typescript
class ReadGuard {
  readFile(filePath: string, budget: number): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.length <= budget) return content;

    // Head + tail strategy
    const headLen = Math.floor(budget * 0.4);
    const tailLen = Math.floor(budget * 0.4);
    const omitted = content.length - headLen - tailLen;

    return (
      content.slice(0, headLen) +
      `\n\n[... ${omitted.toLocaleString()} characters omitted for token budget ...]\n\n` +
      content.slice(-tailLen)
    );
  }
}

class ReadBeforeWriteGuard {
  private readFiles: Set<string> = new Set();
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  markRead(path: string): void {
    this.readFiles.add(path);
  }

  canWrite(path: string): { allowed: boolean; reason?: string } {
    if (!this.enabled) return { allowed: true };
    if (this.readFiles.has(path)) return { allowed: true };
    return { allowed: false, reason: `Must read ${path} before editing it` };
  }
}
```

### 7. QualityMonitor (`quality.ts`)

```typescript
class QualityMonitor {
  checkTurn(turn: Turn): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check empty tool calls
    if (turn.toolCalls.length === 0 && turn.text.trim().length < 10) {
      issues.push({
        severity: 'error',
        type: 'empty_turn',
        message: 'Model produced empty turn with no tool calls',
      });
    }

    // Check hallucinated tool names
    for (const call of turn.toolCalls) {
      if (!this.availableTools.has(call.name)) {
        issues.push({
          severity: 'warning',
          type: 'hallucinated_tool',
          message: `Unknown tool: ${call.name}. Available: ${[...this.availableTools].join(', ')}`,
        });
      }
    }

    return issues;
  }
}
```

## Configuration

```json
{
  "smallModelOptimization": {
    "enabled": true,
    "tokenBudgetReservedForResponse": 4096,
    "tokenBudgetReservedForTools": 4096,
    "toolResultMaxChars": 4096,
    "fuzzyPatchEnabled": true,
    "readGuardEnabled": true,
    "readBeforeWriteGuard": true,
    "qualityMonitorEnabled": true,
    "retryTemperatureStart": 0.1,
    "retryTemperatureStep": 0.4,
    "dedupWindowSize": 20
  }
}
```

## Detection

Auto-enable when model context window < 32K or parameter count < 35B:

```typescript
function shouldEnableSmallModelOptimization(model: ModelInfo): boolean {
  if (model.contextWindow && model.contextWindow < 32_768) return true;
  if (model.parameters && model.parameters < 35_000_000_000) return true;
  return false;
}
```
