# Design: Cost Tracking

**Status:** Design
**Date:** 2026-05-28
**Priority:** P2

---

## Problem

Users cannot track token usage or cost in qwen-lyra. No visibility into:

- How much a session cost
- Which model is most cost-effective
- Budget management

Competitor: OpenCode has per-session cost tracking.

---

## Solution

Add token counting and cost estimation throughout the system.

---

## Components

### 1. Token Counter

```typescript
interface TokenCount {
  prompt: number; // input tokens
  completion: number; // output tokens
  total: number;
}

class TokenCounter {
  count(message: Message, model: string): TokenCount;
  countHistory(history: Message[], model: string): TokenCount;

  // Use model-specific tokenizer
  // Claude: claude-tokenizer
  // GPT: tiktoken
  // Qwen: qwen-tokenizer
}
```

---

### 2. Cost Calculator

```typescript
interface ModelPricing {
  input: number; // per 1M tokens
  output: number; // per 1M tokens
  currency: string; // USD
}

const PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet': { input: 3.0, output: 15.0, currency: 'USD' },
  'gpt-4o': { input: 2.5, output: 10.0, currency: 'USD' },
  'qwen-max': { input: 0.5, output: 2.0, currency: 'USD' },
  'qwen-7b-local': { input: 0, output: 0, currency: 'USD' }, // free
};

class CostCalculator {
  calculate(tokens: TokenCount, model: string): Cost {
    const pricing = PRICING[model];
    return {
      input: (tokens.prompt / 1_000_000) * pricing.input,
      output: (tokens.completion / 1_000_000) * pricing.output,
      total: 0, // computed
    };
  }
}
```

---

### 3. Session Cost Tracking

```typescript
interface SessionCost {
  sessionId: string;
  startTime: string;
  endTime?: string;

  requests: RequestCost[];

  totalTokens: TokenCount;
  totalCost: Cost;

  modelBreakdown: Record<string, TokenCount & Cost>;
  toolBreakdown: Record<string, TokenCount>; // tokens spent on tool results
}

class SessionCostTracker {
  startSession(sessionId: string): void;
  logRequest(request: RequestCost): void;
  endSession(): SessionCost;

  // Running total
  getCurrentSpend(): Cost;
}
```

---

### 4. Budget Management

```typescript
interface BudgetConfig {
  dailyLimit?: number; // USD
  sessionLimit?: number; // USD
  monthlyLimit?: number; // USD
  alertThreshold: number; // 0-1, e.g., 0.8 = alert at 80%
}

class BudgetManager {
  checkBudget(spend: Cost, config: BudgetConfig): BudgetStatus;
  // Returns: ok | warning | exceeded
  // Emits: console warning, TUI notification, or blocks request
}
```

---

### 5. UI Integration

**Status line:**

```
[Session: $0.45 | 12.3k tokens] [Model: qwen-max] [Budget: 45%]
```

**Summary on exit:**

```
┌─ Session Summary ──────────────────────────────┐
│ Duration: 45 minutes                          │
│ Requests: 23                                  │
│ Tokens: 12,345 (9,876 in / 2,469 out)         │
│ Cost: $0.45 USD                               │
│ Most used model: qwen-max (85%)               │
│ Most expensive tool: edit (3,200 tokens)       │
└───────────────────────────────────────────────┘
```

**Real-time notification:**

```
⚠️  Budget alert: $0.80 of $1.00 daily limit (80%)
```

---

### 6. CLI Commands

```bash
# Show current session cost
qwen cost

# Show cost history
qwen cost history --days=7

# Set budget
qwen config set budget.dailyLimit=1.00
qwen config set budget.alertThreshold=0.8

# Export cost report
qwen cost export --format=csv > costs.csv
```

---

### 7. Storage

```
~/.config/qwen-lyra/costs/
├── 2026-05/
│   ├── session-abc123.json
│   ├── session-def456.json
│   └── daily.json
```

---

## Files to Modify

- `packages/core/src/core/client.ts` — inject token counting
- `packages/core/src/cost/` — new directory
- `packages/cli/src/ui/` — status line cost display
- `packages/cli/src/commands/` — cost CLI commands

---

## Success Metrics

- Cost accuracy: target ±5% of actual API bill
- Token count accuracy: target ±2% of actual usage
- User budget compliance: target 95%+

---

## References

- OpenCode: cost tracking implementation
