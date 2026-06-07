# Gap-4: Model Escalation Fallback

## Status

**Phase:** Implementation
**Priority:** P2 (High)
**Competitor:** SmallCode auto-fallback to Claude/OpenAI/DeepSeek

## Problem

When a small/local model (e.g., Qwen 7B) fails to solve a task or makes repeated errors, the system currently has no graceful degradation path. The retry loop in `geminiChat.ts` only retries the **same model** — it never switches to a stronger model.

This means:

- A failing local model wastes retry budget on the same failing provider
- Users must manually switch models when the current one is failing
- No automatic path from cheap/fast model to strong model for hard tasks

## Desired Outcome

When the primary model fails with escalation-worthy errors (auth errors, model not found, persistent server errors, repeated quality issues), the system automatically escalates to the next model in a configured chain. The escalation is transparent to the user — they see a retry event, not an error.

## Architecture

### A. Escalation Chain Configuration

Add `escalationChain` to `ModelProvidersConfig`:

```typescript
interface EscalationStep {
  model: string;
  authType?: AuthType;
  baseUrl?: string;
  onErrors?: EscalationTrigger[];
}

type EscalationTrigger =
  | 'auth_error' // 401, 403
  | 'not_found' // 404 model not found
  | 'server_error' // Persistent 5xx
  | 'rate_limit' // Rate limit exhausted
  | 'context_overflow' // Context exceeded and compression failed
  | 'max_tokens' // MAX_TOKENS with no recovery
  | 'quality_failure'; // Small-model quality check failed N times
```

Default chain (if not configured): empty — no escalation, behavior unchanged.

### B. EscalationManager

New class in `packages/core/src/models/escalationManager.ts`:

```typescript
class EscalationManager {
  constructor(private config: Config);

  /** Get the escalation chain for current model */
  getChain(): EscalationStep[];

  /** Check if error should trigger escalation */
  shouldEscalate(error: unknown, step: number, triggers?: EscalationTrigger[]): boolean;

  /** Get next model in chain, or undefined if exhausted */
  getNextStep(step: number): { model: string; authType?: AuthType; baseUrl?: string } | undefined;

  /** Switch to the next model via Config.setModel() */
  async escalate(step: number): Promise<void>;
}
```

Error classification:

- `auth_error`: 401, 403, API key invalid
- `not_found`: 404, model decommissioned
- `server_error`: 5xx for N consecutive retries
- `rate_limit`: rate limit retries exhausted
- `context_overflow`: reactive compression failed
- `max_tokens`: MAX_TOKENS with no recovery
- `quality_failure`: SmallModelMiddleware detects repeated quality issues

### C. Integration in geminiChat.ts

Wrap the `sendMessageStream` retry loop:

```typescript
const escalationManager = new EscalationManager(self.config);
const chain = escalationManager.getChain();
let currentStep = 0;

for (let attempt = 0; attempt < maxAttempts; attempt++) {
  try {
    const stream = await self.makeApiCallAndProcessStream(
      chain[currentStep]?.model ?? model,
      ...
    );
    // ... process stream
    break;
  } catch (error) {
    // Existing retry logic: rate limit, transient, content errors...
    // ...

    // NEW: Escalation fallback
    if (escalationManager.shouldEscalate(error, currentStep)) {
      const next = escalationManager.getNextStep(currentStep);
      if (next) {
        await escalationManager.escalate(currentStep);
        currentStep++;
        // Reset retry counters for new model
        rateLimitRetryCount = 0;
        invalidStreamRetryCount = 0;
        attempt = -1; // restart loop
        continue;
      }
    }

    // ... existing break/throw
  }
}
```

### D. Small-Model Integration

The `SmallModelMiddleware` already tracks `attemptCount` and quality issues. When quality failures accumulate beyond a threshold, signal escalation to the manager.

```typescript
// In SmallModelMiddleware.postResponse()
if (qualityIssues.length >= QUALITY_ESCALATION_THRESHOLD) {
  // Signal to chat loop that escalation is needed
  // Option A: throw special EscalationError
  // Option B: set flag on config that chat loop checks
}
```

### E. Configuration

Settings entry:

```json
{
  "modelProviders": {
    "escalationChain": [
      { "model": "qwen2.5-7b-instruct", "onErrors": ["quality_failure"] },
      {
        "model": "qwen-coder",
        "authType": "qwen_oauth",
        "onErrors": ["auth_error", "server_error", "rate_limit"]
      },
      { "model": "claude-sonnet-4", "authType": "anthropic", "onErrors": ["*"] }
    ]
  }
}
```

## Non-Goals

- Do not implement proactive model selection ("use cheap model first, escalate on hard tasks")
- Do not implement cost-aware escalation ("only escalate if cost < threshold")
- Do not implement model performance profiling ("track which model is fastest")
- Do not change the default behavior when no escalation chain is configured

## Success Criteria

- When a model fails with escalation-worthy error, the system automatically switches to the next model in the chain
- The user sees a retry event, not an error
- The original model is restored after the session (or kept if configured)
- Escalation works across auth types (OpenAI → Qwen OAuth → Anthropic)
- Small-model quality failures can trigger escalation
- No regression when no escalation chain is configured

## Risks

- **Escalation can be expensive** — switching to Claude/GPT without user consent may surprise users
  - Mitigation: require explicit escalation chain configuration; no default chain
- **Cross-authType switching can be slow** — refreshing auth/credentials adds latency
  - Mitigation: cache credentials for common auth types; warn if cold auth needed
- **Model switching can lose context** — different models have different context windows
  - Mitigation: compression before escalation if needed; log warning
- **Escalation loop** — if all models in chain fail, the loop must terminate cleanly
  - Mitigation: hard limit on total escalation steps; final error propagated to user

## Test Strategy

- Unit: `EscalationManager.shouldEscalate()` with mock errors
- Unit: `EscalationManager.escalate()` calls `Config.setModel()` correctly
- Integration: `sendMessageStream` escalates on 404 error
- Integration: `sendMessageStream` escalates on small-model quality failure
- Regression: no escalation when chain is empty
