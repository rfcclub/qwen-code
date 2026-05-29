# Implementation Tasks

## 1. Foundation Setup

- [ ] 1.1 Create `packages/core/src/small-model/` directory structure
- [ ] 1.2 Create `types.ts` with shared interfaces

## 2. Token Budget Engine

- [ ] 2.1 Implement `TokenBudgetManager` class
- [ ] 2.2 Implement message eviction + semantic compression
- [ ] 2.3 Implement tool result size capping
- [ ] 2.4 Auto-detect whether to enable (model context window < 32K)

## 3. Forgiving Tool Parser

- [ ] 3.1 Implement JSON parser with auto-repair
- [ ] 3.2 Implement YAML parser
- [ ] 3.3 Implement XML parser
- [ ] 3.4 Implement plain-text extraction
- [ ] 3.5 Implement fallback chain (JSON → YAML → XML → plain text)

## 4. Patch-First Editing

- [ ] 4.1 Implement `Patch` interface and `PatchEngine`
- [ ] 4.2 Implement exact match
- [ ] 4.3 Implement fuzzy match (whitespace normalization)
- [ ] 4.4 Implement line-range constrained matching
- [ ] 4.5 Wire into `edit` tool as primary mode (fallback to current behavior)

## 5. TODO-Driven Planning

- [ ] 5.1 Implement `TodoPlanner` class
- [ ] 5.2 Implement plan injection into system prompt
- [ ] 5.3 Implement stuck-step detection (>5 turns on one step)

## 6. Tool Deduplication

- [ ] 6.1 Implement `ToolDeduplicator` with sliding window
- [ ] 6.2 Implement read-only tool detection
- [ ] 6.3 Wire into tool execution pipeline

## 7. Read Guards

- [ ] 7.1 Implement `ReadGuard` with head-tail truncation
- [ ] 7.2 Implement `ReadBeforeWriteGuard`
- [ ] 7.3 Wire into tool execution pipeline

## 8. Quality Monitor

- [ ] 8.1 Implement empty turn detection
- [ ] 8.2 Implement hallucinated tool name detection
- [ ] 8.3 Implement quality issue recovery (request retry)

## 9. Adaptive Retry + Trust

- [ ] 9.1 Implement temperature curve per retry
- [ ] 9.2 Implement per-tool trust scoring
- [ ] 9.3 Wire into LLM provider configuration and tool schema generation

## 10. Integration + Config

- [ ] 10.1 Create `index.ts` factory function
- [ ] 10.2 Wire middleware into `client.ts` pre/post request pipeline
- [ ] 10.3 Add config options to settings.json
- [ ] 10.4 Add `--no-small-model-optimization` CLI flag
- [ ] 10.5 Add status line indicator (🐇 mode)
- [ ] 10.6 Build + typecheck
- [ ] 10.7 Run existing tests (184) — expect no regression

## 11. Tests

- [ ] 11.1 Unit tests for TokenBudgetManager
- [ ] 11.2 Unit tests for ForgivingToolParser
- [ ] 11.3 Unit tests for PatchEngine
- [ ] 11.4 Unit tests for ToolDeduplicator
- [ ] 11.5 Unit tests for QualityMonitor
- [ ] 11.6 Integration test: small-model optimization enabled for models <32K
