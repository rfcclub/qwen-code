# Qwen-Lyra Competitive Gap Roadmap

**Date:** 2026-05-28
**Competitors analyzed:** Codex, OpenCode, Claw Code, SmallCode
**Priority:** P1 (Critical), P2 (High), P3 (Medium)

---

## Phase 1 (Current)

### 1. Small-Model Optimization Layer [P1]

**Gap:** Qwen-lyra assumes frontier models. No compensating infrastructure for 7B-14B local models.

**Competitor:** SmallCode extracts 87% success from 4B-active models.

**Why critical:** Aligns with Qwen open-source mission. Many users run Qwen 7B/14B locally.

**Components needed:**

- Token Budget Engine (context window enforcement)
- Forgiving Tool Parser (JSON/YAML/XML/Hermes/plain text)
- Patch-First Editing (search-and-replace vs full rewrites)
- TODO-Driven Planning (atomic steps, plan anchoring)
- Tool Deduplication (sliding window short-circuit)
- Context-Aware Read Guard (intelligent truncation)
- Read-Before-Write Guard
- Quality Monitor (empty turns, hallucinated tools)
- Adaptive Retry Temperature
- Per-Tool Trust Score Decay

---

### 3. Deepen MCP + LSP Integration [P1]

**Gap:** MCP exists as a tool but not first-class lifecycle. LSP exists but not auto-discovered.

**Competitor:** Codex (mcp crate, auth, resources), OpenCode (auto-load LSP per language).

**Components needed:**

- MCP lifecycle management (list, show, auth, resources, install)
- LSP auto-discovery per project type
- LSP diagnostics integration into TUI
- MCP server marketplace/discovery

---

### 5. Benchmark Harness [P1]

**Gap:** No built-in way to measure model/agent performance.

**Competitor:** SmallCode has smoke, polyglot-mini, tool-use suites.

**Components needed:**

- Smoke tests (basic commands)
- Polyglot suite (multi-language code gen)
- Tool-use suite (tool calling accuracy)
- Regression tracking across model versions
- Pass rate dashboards

---

### 6. Plugin System with Hooks [P1]

**Gap:** Extensibility limited to skills. No lifecycle hooks.

**Competitor:** OpenCode (plugins), Claw Code (hooks), SmallCode (lifecycle hooks).

**Components needed:**

- Plugin manifest format
- Lifecycle hooks (pre/post request, session start/end, error)
- Provider registry for custom models
- Tool registry for custom tools
- Command registry for custom slash commands

---

### 7. Evidence Store / Persistent Learning [P1]

**Gap:** No learning from past session failures.

**Competitor:** SmallCode evidence store captures "what was tried, what worked, what failed."

**Components needed:**

- Evidence capture per task
- Categorization (decision, workflow, gotcha, convention)
- Auto-injection into relevant future sessions
- Confidence scoring for evidence relevance

---

### 8. Patch-First Editing + Semantic Merge [P1]

**Gap:** Relies on full-file rewrites. Failed patches are hard errors.

**Competitor:** SmallCode patch-first with merge fallback.

**Components needed:**

- Search-and-replace as primary edit primitive
- Multi-line patch support
- Semantic merge on patch failure
- Fallback to full rewrite only when patch fails

---

### 9. Cost Tracking [P2]

**Gap:** No per-session token usage or cost display.

**Competitor:** OpenCode has cost tracking.

**Components needed:**

- Token counting per request/response
- Cost estimation per model pricing
- Session-level and task-level aggregation
- Optional alerts on budget thresholds

---

### 10. Multi-Session Support [P2]

**Gap:** Cannot run multiple agents concurrently.

**Competitor:** OpenCode has parallel agents.

**Components needed:**

- Session isolation (state, history, tools)
- Session manager (list, switch, kill)
- Inter-session communication (optional)
- Resource sharing (config, knowledge base)

---

## Phase 2 (Future)

### 2. Desktop App [P2]

**Gap:** No GUI option. Only terminal TUI.
**Platforms:** Windows (WSL), Linux, macOS.
**Challenge:** Cross-platform compatibility (WSL vs native).
**Status:** Deferred to Phase 2.

### 4. Model Escalation Fallback [P2]

**Gap:** No graceful degradation when local model fails.
**What it is:** When a small/local model (e.g. Qwen 7B) fails to solve a task or makes repeated errors, the system can optionally escalate the request to a stronger model (cloud API like Claude/GPT/Qwen-Max) for that specific task. The result is returned to the local flow. User can configure which models are fallback targets and the conditions for escalation (number of retries, task complexity score).
**Competitor:** SmallCode auto-fallback to Claude/OpenAI/DeepSeek.
**Status:** Deferred to Phase 2.
