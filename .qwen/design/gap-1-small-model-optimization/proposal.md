# Small-Model Optimization Layer

## Why

Qwen-lyra currently assumes frontier models (Claude 3.5, GPT-4o, Qwen-Max). Users running Qwen 7B or 14B locally experience context overflow, malformed tool calls, and task drift — not because small models are incapable, but because the infrastructure does not compensate for their limitations.

Without this layer, the project's open-source mission (support Qwen models at all sizes) is unrealized.

## What Changes

A "Compensating Infrastructure" layer that makes small models (8B-35B parameters) viable for autonomous coding.

## Impact

- **Affected specs:** small-model-optimization (new capability)
- **Affected code:**
  - `packages/core/src/core/client.ts` — inject compensating layer before LLM request
  - `packages/core/src/small-model/` — new directory (all components)
  - `packages/core/src/tools/edit.ts` — enhance for patch-first mode
  - `packages/core/src/tools/patch.ts` — new patch tool
  - `packages/cli/src/config/config.ts` — config options
  - `packages/cli/src/ui/` — status line indicator
- **Affected changes:** None

## Non-Goals

- No change to how frontier models work
- No performance degradation for non-small-model users
- No changes to existing tool schemas (new tools are additive)

## Success Criteria

- Qwen 7B pass rate on smoke tests: 70%+
- Qwen 14B pass rate: 85%+
- Token usage reduction vs full rewrites: 50%+
- Zero context overflow incidents
- Zero regression in frontier model performance
