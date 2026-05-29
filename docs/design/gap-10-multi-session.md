# Design: Multi-Session Support

**Status:** Design
**Date:** 2026-05-28
**Priority:** P2

---

## Problem

Qwen-lyra runs one session at a time. Cannot:

- Run multiple agents concurrently
- Switch between tasks without losing context
- Have background sessions

Competitor: OpenCode has parallel agents.

---

## Solution

Add multi-session support with session isolation and management.

---

## Components

### 1. Session Model

```typescript
interface Session {
  id: string; // unique session ID
  name: string; // user-defined or auto-generated
  status: 'active' | 'paused' | 'completed' | 'error';

  createdAt: string;
  lastActiveAt: string;

  // Isolation
  history: Message[]; // independent conversation history
  config: Config; // session-specific config overrides
  workingDirectory: string; // may differ from main session

  // State
  context: SessionContext; // file reads, tool state, etc.
  todoList: Todo[]; // per-session TODOs

  // Resources
  tokenUsage: TokenCount;
  cost: Cost;
}
```

---

### 2. Session Manager

```typescript
class SessionManager {
  // CRUD
  create(name: string, config?: Partial<Config>): Session;
  get(id: string): Session | undefined;
  list(): Session[];
  kill(id: string): void;

  // Lifecycle
  switch(id: string): void; // switch active session
  pause(id: string): void; // background session
  resume(id: string): void; // bring to foreground

  // Bulk operations
  killAll(): void;
  export(id: string): string; // export session to file
  import(data: string): Session; // import session from file
}
```

---

### 3. Session Isolation

Each session runs in isolation:

```typescript
interface SessionIsolation {
  // Process isolation
  pid?: number; // separate process (optional)

  // State isolation
  history: Message[];
  fileCache: Map<string, string>; // separate read cache
  toolState: Map<string, unknown>; // separate tool state

  // Config isolation
  config: Config; // can override global config
  env: Record<string, string>; // can set env vars
}
```

**Shared resources (read-only):**

- Global config (unless overridden)
- Plugin registry
- Evidence store
- Knowledge directory

---

### 4. TUI Integration

**Session list:**

```
┌─ Sessions ───────────────────────────────────┐
│                                              │
│ ▶ main        active    45m  $0.45           │
│   backend     paused    12m  $0.12           │
│   frontend    active     8m  $0.08           │
│   docs        active     3m  $0.03           │
│                                              │
│ [N]ew  [S]witch  [K]ill  [R]ename          │
└──────────────────────────────────────────────┘
```

**Status line:**

```
[main] [45m] [$0.45] [3 active sessions]
```

---

### 5. CLI Commands

```bash
# List sessions
qwen session list

# Create new session
qwen session new --name=backend

# Switch session
qwen session switch backend

# Kill session
qwen session kill backend

# Pause (background)
qwen session pause backend

# Resume
qwen session resume backend

# Rename
qwen session rename backend api-server

# Export session
qwen session export backend > backend-session.json

# Import session
qwen session import < backend-session.json
```

---

### 6. Inter-Session Communication (Optional)

```typescript
interface SessionBus {
  // Publish message to all sessions or specific session
  publish(message: SessionMessage, target?: string): void;

  // Subscribe to messages from other sessions
  subscribe(handler: (msg: SessionMessage) => void): void;
}

interface SessionMessage {
  from: string;
  type: 'notification' | 'request' | 'result';
  payload: unknown;
}
```

**Use case:**

- Session A finishes API design → notifies Session B (frontend) to update types
- Session C finds a bug → broadcasts to all sessions

---

### 7. Background Sessions

Sessions can run in background:

- Agent continues working while user switches to another session
- Results queued for review when user returns
- Similar to `tmux` or `screen` for agents

**Implementation:**

- Daemon mode (`qwen serve`) already exists
- Extend to support named background sessions
- Results stored in SQLite, retrieved on resume

---

## Files to Modify

- `packages/core/src/session/` — new directory (or extend existing)
- `packages/cli/src/ui/` — session list UI
- `packages/cli/src/commands/` — session CLI commands
- `packages/daemon/` — extend daemon for background sessions

---

## Success Metrics

- Max concurrent sessions: target 5+
- Session switch time: target <100ms
- Memory per session: target <50MB
- Background session reliability: target 99%+

---

## References

- OpenCode: parallel agents implementation
- Tmux/Screen: process persistence patterns
