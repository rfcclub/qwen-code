# Design: Benchmark Harness

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

No built-in way to measure model/agent performance in qwen-lyra. Cannot:

- Track regression between versions
- Compare model performance (Qwen 7B vs 14B vs Max)
- Measure tool-use accuracy
- Validate changes before release

Competitor: SmallCode has smoke, polyglot-mini, tool-use suites.

---

## Solution

Build a benchmark harness with standard test suites.

---

## Components

### 1. Test Suite Structure

```typescript
interface BenchmarkSuite {
  name: string;
  description: string;
  tasks: BenchmarkTask[];
}

interface BenchmarkTask {
  id: string;
  name: string;
  type: 'smoke' | 'polyglot' | 'tool-use' | 'integration';
  setup?: () => Promise<void>; // create temp project
  prompt: string; // what to ask the agent
  validation: ValidationMethod; // how to check success
  timeout: number; // seconds
  expectedCost?: number; // token budget
}

interface ValidationMethod {
  type: 'file_exists' | 'file_contains' | 'command_succeeds' | 'custom';
  params: Record<string, unknown>;
}
```

---

### 2. Suite Types

#### Smoke Tests

Quick sanity checks (30s - 2min each).

Examples:

- `ls` command works
- `read_file` returns correct content
- `write_file` creates file
- `edit` modifies file correctly
- Shell command execution
- Basic chat response

#### Polyglot Suite

Multi-language code generation (2-5min each).

Examples:

- Write a Python function that sorts a list
- Write a TypeScript class with interface
- Write a Rust function with error handling
- Write a Go HTTP handler
- Write SQL query with JOIN

Validation: compile + run + output check.

#### Tool-Use Suite

Tool calling accuracy (1-3min each).

Examples:

- "Find all files containing TODO" → expect `grep_search`
- "Show me the last 5 commits" → expect `run_shell_command(git log)`
- "Edit line 42 of file.ts" → expect `edit`
- "Create a new file at src/utils.ts" → expect `write_file`

Validation: correct tool called + correct params.

#### Integration Suite

End-to-end workflows (5-10min each).

Examples:

- "Create a React component with tests" (multi-step)
- "Refactor this function to use async/await" (read + edit + verify)
- "Add error handling to this API endpoint" (multi-file edit)

---

### 3. Benchmark Runner

```typescript
class BenchmarkRunner {
  run(suite: BenchmarkSuite, model: string): Promise<BenchmarkResult>;
  runAll(suites: BenchmarkSuite[], model: string): Promise<BenchmarkReport>;
}

interface BenchmarkResult {
  taskId: string;
  passed: boolean;
  duration: number; // ms
  tokenUsage: number;
  cost?: number;
  error?: string;
  retries: number;
}

interface BenchmarkReport {
  model: string;
  timestamp: string;
  results: BenchmarkResult[];
  passRate: number; // percentage
  avgDuration: number;
  totalCost?: number;
  comparison?: BenchmarkComparison; // vs previous run
}
```

---

### 4. Regression Tracking

```typescript
interface BenchmarkComparison {
  previousRun: string; // timestamp of baseline
  passRateDelta: number; // +5% or -3%
  newFailures: string[];
  fixedFailures: string[];
  performanceDelta: number; // avg duration change
}

class RegressionTracker {
  save(report: BenchmarkReport): Promise<void>;
  compare(current: BenchmarkReport, baseline: string): BenchmarkComparison;
  // Baseline stored in .qwen/benchmarks/baseline.json
}
```

---

### 5. CLI Interface

```bash
# Run all suites
qwen benchmark

# Run specific suite
qwen benchmark --suite=smoke
qwen benchmark --suite=polyglot

# Compare against baseline
qwen benchmark --compare=2026-05-20

# Run with specific model
qwen benchmark --model=qwen-7b-local

# Output formats
qwen benchmark --format=json   # machine readable
qwen benchmark --format=html  # dashboard
qwen benchmark --format=md    # markdown report
```

---

### 6. Dashboard

Web dashboard showing:

- Pass rate trends over time
- Per-model comparison (Qwen 7B vs 14B vs Max)
- Per-suite breakdown (smoke vs polyglot vs tool-use)
- Slowest tasks
- Most expensive tasks
- Regression alerts

---

## Files to Create

```
packages/benchmark/
├── src/
│   ├── suites/
│   │   ├── smoke.ts
│   │   ├── polyglot.ts
│   │   ├── tool-use.ts
│   │   └── integration.ts
│   ├── runner.ts
│   ├── validation.ts
│   ├── regression.ts
│   ├── dashboard.ts
│   └── cli.ts
├── package.json
└── tsconfig.json
```

---

## Success Metrics

- Smoke suite pass rate for Qwen-Max: target 95%+
- Smoke suite pass rate for Qwen-14B: target 85%+
- Smoke suite pass rate for Qwen-7B: target 70%+
- Regression detection: catch 90%+ of breaking changes before release
- Benchmark runtime: full suite <30min

---

## References

- SmallCode: `~/repo/smallcode` benchmark implementation
