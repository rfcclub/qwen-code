---
name: competitive-analysis
description: Research competitor AI coding tools, identify capability gaps,
  and produce a structured ROADMAP with design docs. Use when the user wants to
  understand how qwen-lyra compares to other tools or plan feature parity work.
source: auto-skill
extracted_at: '2026-05-29T01:21:26.213Z'
---

# Competitive Analysis Workflow

Follow this workflow to analyze competitor AI coding agents, identify gaps, and
produce actionable design documents. Do not skip the research phase — jumping to
conclusions without reading competitor code produces inaccurate gap analysis.

## When to use

- User asks "how do we compare to X?"
- User wants feature parity with Codex, Claude Code, OpenCode, etc.
- User says "what should we build next?"
- After a user session where competitor features are mentioned

## Artifact Paths

- `.qwen/design/ROADMAP.md` — the summary roadmap
- `.qwen/design/gap-N-short-name.md` — one design doc per gap

## Step 1: Discover Competitor Repos

Ask the user which competitors to analyze, or propose a default set:

```bash
# Default competitors if user does not specify
~/repo/codex      # OpenAI Codex CLI
~/repo/opencode   # OpenCode
~/repo/claw-code  # Claw Code (Rust Claude Code port)
~/repo/smallcode  # SmallCode (small-model optimized)
```

Read each repo's:

- `README.md` — what is it, key features
- `package.json` / `Cargo.toml` — dependencies, architecture hints
- Source tree structure (`ls -R src/` or `find src -type f | head -50`)
- Any `docs/` or `design/` directories

## Step 2: Extract Key Capabilities

For each competitor, produce a structured summary:

| Field        | What to capture                         |
| ------------ | --------------------------------------- |
| What         | One-sentence description                |
| Language     | Rust, TypeScript, Go, etc.              |
| Key Features | 3-5 standout features                   |
| Architecture | Monorepo structure, key crates/packages |
| Unique       | Capabilities NOT in qwen-lyra           |
| Integration  | MCP, LSP, IDE, cloud, etc.              |

Use `grep` and `read_file` to find specific implementations (e.g. sandboxing,
plugin system, cost tracking) rather than trusting README claims.

## Step 3: Baseline Assessment

Read qwen-lyra's current state:

- `packages/cli/src/` — CLI features
- `packages/core/src/` — core capabilities
- `AGENTS.md` — build/test commands
- Existing tools list (grep for `export const` or `Tool` in tools dir)

Document what qwen-lyra already has. Do not list gaps yet — just establish
baseline.

## Step 4: Gap Analysis

Compare each competitor against the baseline. For each gap:

1. **Name** the gap clearly (e.g. "No OS-level sandboxing")
2. **Competitor** who has it
3. **Impact** — P1 (critical), P2 (high), P3 (medium)
4. **Why** — why does this matter for qwen-lyra users?
5. **Components** — what would need to be built?

Use a table for the summary:

```markdown
| Gap                    | Competitor(s) | Impact |
| ---------------------- | ------------- | ------ |
| No OS-level sandboxing | Codex         | P1     |
```

## Step 5: Write ROADMAP.md (Phase Structure)

Create `.qwen/design/ROADMAP.md` with:

- Header: date, competitors analyzed, priority legend
- **Phase 1 (Current)** — P1 gaps actively being worked
- **Phase 2 (Future)** — deferred P2 gaps with explicit "why deferred" explanation
- One subsection per gap with components needed
- Priority summary table
- Rationale for each priority level
- "Next step" pointer (usually: design/implement P1 items)

## Step 6: Write Design Docs (OpenSpec Format)

For prioritized gaps, create a directory (not a single file):
`.qwen/design/gap-N-short-name/`

Each directory MUST contain four files:

### 6a. `proposal.md`

```
# [Capability Name]

## Why
[1-2 sentences on the problem or opportunity]

## What Changes
[Bullet list of what needs to change — explicit from/to]

## Impact
- Affected specs: [capability names]
- Affected code: [file paths]
- Affected changes: [pending changes that may conflict]

## Non-Goals
[Explicitly out of scope]

## Dependencies
[Prerequisite changes or conditions]

## Success Criteria
[Metrics with specific targets — e.g. "Qwen 7B pass rate: 70%+"]
```

### 6b. `spec.md`

Behavioral requirements in GIVEN/WHEN/THEN format:

```
## Requirements

### Requirement: [Descriptive Name Under 50 Chars]
The SHALL system [mandatory behavior].

#### Scenario: [Short description]
- **GIVEN** [initial state or context — optional]
- **WHEN** [trigger or condition]
- **THEN** [expected outcome]
- **AND** [additional outcomes — optional]
```

- Each `### Requirement:` header is a unique ID for delta tracking
- Write 3-10 requirements per spec
- Keep scenarios under 5 lines

### 6c. `design.md`

Technical architecture with:

- **Architecture** — ASCII diagram of the data flow or middleware pipeline
- **Module structure** — directory tree with file names
- **Component details** — class headers, key method signatures, TypeScript interfaces
- **Configuration schema** — JSON schema or TypeScript `interface SmallModelConfig`
- **Detection logic** — auto-enable rules (e.g. "enable when context window < 32K")
- **References** — link to competitor source for implementation reference

### 6d. `tasks.md`

Numbered checklist:

```
## N. [Task Group Name]
- [ ] N.1 [Actionable, independently verifiable subtask]
- [ ] N.2 [Actionable, independently verifiable subtask]
```

Group by: Foundation → Component 1 → Component 2 → ... → Integration → Tests

## Step 7: Implement Components

After design is approved, implement each component following the spec.

### 7a. Directory & File Layout

```
packages/core/src/<new-capability>/
├── types.ts              # Shared interfaces + config types + defaults
├── budget.ts             # Token budget management (TokenBudgetManager)
├── parser.ts             # Forgiving input parsing (ForgivingToolParser)
├── plan.ts               # TODO/planning (TodoPlanner)
├── dedup.ts              # Tool deduplication (ToolDeduplicator)
├── read-guard.ts         # Read guards (ReadGuard, ReadBeforeWriteGuard)
├── quality.ts            # Quality monitoring + trust + retry temp
├── patch.ts              # Patch engine with fuzzy matching
└── index.ts              # Factory + middleware class + barrel exports
```

### 7b. Middleware Pattern

Wire all components into a single middleware class:

```typescript
export class SmallModelMiddleware {
  public budget: TokenBudgetManager;
  public parser: ForgivingToolParser;
  public plan: TodoPlanner;
  // ... all components

  constructor(
    modelMaxTokens: number,
    availableTools: string[],
    config?: Partial<Config>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Initialize all components
  }

  preRequest(ctx: PreRequestContext): PreRequestContext {
    // 1. Inject plan context
    // 2. Enforce token budget (evict if needed)
    // 3. Set adaptive temperature
    return ctx;
  }

  postResponse(text: string, rawCalls: unknown[]): PostResponseContext {
    // 1. Parse tool calls with forgiving parser
    // 2. Quality check (empty turns, hallucinated tools)
    // 3. Track retry count and trust scores
    return ctx;
  }
}
```

### 7c. Import & Type Rules

- **ESM imports only** — `import { readFileSync } from 'node:fs'`
- **NO `require()`** — never use CommonJS in this project
- **NO `async import()` in sync contexts** — prefer top-level ESM
- **NO `any` type** — use `Record<string, unknown>`, type assertions with `as`, or partial interfaces
- **One class per file** — keep components focused and testable
- **Types in `types.ts`** — all shared interfaces, imported by all components

### 7d. Pre-Commit Checks

Run these before attempting commit:

```bash
# TypeScript check — fix ALL errors
cd packages/core && npx tsc --noEmit

# Common pre-commit failures:
# 1. Unused imports (TS6133) — remove them
# 2. Unnecessary regex escapes — inside [], `.` and `)` don't need `\`
# 3. `any` types — use Record<string, unknown> instead
# 4. Trailing whitespace — auto-fixable
```

If `.qwen/design/` is gitignored, add to `.gitignore` whitelist:

```bash
!.qwen/design/
!.qwen/design/**
```

## Step 8: Commit Design + Code Together

```bash
git add .qwen/design/gap-N-short-name/ packages/core/src/<new-capability>/
git commit -m "feat(<scope>): implement <capability>

- Component1: what it does
- Component2: what it does
- OpenSpec design docs (proposal, spec, design, tasks)
- Update ROADMAP phase structure"
```

## Rules

- **Do not skip reading competitor code.** READMEs lie. Read source.
- **Do not inflate gaps.** If qwen-lyra already has it (even differently), do not
  list it.
- **Do not design deferred items.** Phase 2 = defer. No design docs for Phase 2.
- **Do not forget baseline.** Always establish what qwen-lyra already has before
  listing gaps.
- **Do not skip metrics.** Every design doc needs measurable success criteria.
- **Do not commit without gitignore check.** Design dir may be ignored.
- **Do not use `any` types.** Use `Record<string, unknown>`.
- **Do not use dynamic `await import()` in sync contexts.** Top-level ESM only.
- **Do not skip pre-commit checks.** The hook runs eslint + prettier; fix before
  committing.

## Example Invocations

```bash
# Analysis only
# User asks: "what do we need to compete with Codex and OpenCode?"
# Steps 1-5: read 4 repos, produce ROADMAP.

# Analysis + Design + Implementation
# User asks: "implement gap-1 design"
# Steps 6-8: create OpenSpec design, implement all components, commit code.
```
