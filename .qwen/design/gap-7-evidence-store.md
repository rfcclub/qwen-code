# Design: Evidence Store / Persistent Learning

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

Qwen-lyra does not learn from past session failures. Every session starts fresh:

- Same mistakes repeated
- No accumulation of "what works"
- No institutional knowledge

Competitor: SmallCode evidence store captures "what was tried, what worked, what failed."

---

## Solution

Build an Evidence Store that captures learnings per task and auto-injects them into relevant future sessions.

---

## Components

### 1. Evidence Types

```typescript
interface Evidence {
  id: string;
  timestamp: string;
  sessionId: string;
  taskId: string; // what we were trying to do

  type: 'decision' | 'workflow' | 'gotcha' | 'convention' | 'fix';

  title: string;
  description: string;
  context: string; // project, file, situation

  outcome: 'success' | 'failure' | 'partial';
  retryStrategy?: string; // what finally worked

  confidence: number; // 0-1, how sure we are this applies
  tags: string[];
}
```

**Types:**

- **Decision:** Why we chose approach A over B
- **Workflow:** Sequence that works for a task type
- **Gotcha:** Trap that caught us (e.g., "don't use rm -rf in this project")
- **Convention:** Project-specific pattern (e.g., "this repo uses kebab-case")
- **Fix:** What fixed a specific error

---

### 2. Evidence Capture

**Automatic capture:**

- When a tool fails, capture: tool name, error, context, what fixed it
- When a task completes, capture: approach used, whether it worked
- When user corrects model, capture: what was wrong, what was right

**Manual capture:**

```bash
qwen evidence add --type=gotcha --title="Don't use X here" --description="..."
```

**Storage:**

```
~/.config/qwen-lyra/evidence/
├── 2026-05-28/
│   ├── session-abc123/
│   │   ├── evidence-1.json
│   │   └── evidence-2.json
```

Or SQLite with FTS5 for search.

---

### 3. Evidence Injection

**When to inject:**

- At session start: inject evidence matching project context
- Before tool call: inject evidence about this tool failing in this project
- After error: inject evidence about similar errors and their fixes

**Relevance scoring:**

```typescript
function scoreEvidence(evidence: Evidence, context: SessionContext): number {
  let score = evidence.confidence;

  // Boost if same project
  if (evidence.project === context.project) score += 0.3;

  // Boost if same file
  if (evidence.file === context.file) score += 0.2;

  // Boost if same tool
  if (evidence.tool === context.tool) score += 0.2;

  // Decay with age
  const age = Date.now() - new Date(evidence.timestamp).getTime();
  score *= Math.max(0.5, 1 - age / (30 * 24 * 60 * 60 * 1000)); // 30-day half-life

  return Math.min(score, 1.0);
}
```

**Injection format:**

```
┌─ Evidence from past sessions ──────────────────┐
│ ⚠️  Gotcha: In this project, do not use        │
│     `rm -rf` on node_modules. Use `npm ci`      │
│     instead. (3 days ago, confidence: 0.9)      │
│                                                │
│ 💡 Workflow: For adding a new route, follow    │
│     this sequence: 1. Add to router,          │
│     2. Add handler, 3. Add test.                │
│     (1 week ago, confidence: 0.8)               │
└────────────────────────────────────────────────┘
```

---

### 4. Knowledge Directory

User can drop files into `knowledge/` directory for project-specific notes:

```
project-root/
├── knowledge/
│   ├── conventions.md      # "We use 4-space indent"
│   ├── gotchas.md          # "Don't touch legacy/ folder"
│   ├── setup.md            # "Run `make dev` not `npm start`"
│   └── decisions/
│       └── 001-why-redux.md
```

**Auto-injection:** Relevant knowledge files injected into system prompt based on current task.

---

### 5. Evidence UI

```bash
# List evidence
qwen evidence list --project=my-project

# Search evidence
qwen evidence search "docker compose"

# Review and rate
qwen evidence rate <id> --confidence=0.9

# Export for sharing
qwen evidence export --project=my-project > project-knowledge.json
qwen evidence import < project-knowledge.json
```

---

## Files to Create

```
packages/core/src/evidence/
├── capture.ts      // automatic evidence detection
├── store.ts        // SQLite + FTS5 storage
├── scoring.ts      // relevance scoring
├── injection.ts    // inject into session context
├── knowledge-dir.ts // read knowledge/ directory
└── cli.ts          // evidence CLI commands
```

---

## Success Metrics

- Evidence captured per session: target 3-5 items
- Evidence retrieval accuracy: target 80%+
- Repeat failure reduction: target 30%+
- User satisfaction with suggestions: target 4/5

---

## References

- SmallCode: `~/repo/smallcode` evidence store implementation
