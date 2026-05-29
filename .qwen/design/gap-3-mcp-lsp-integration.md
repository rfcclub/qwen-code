# Design: Deepen MCP + LSP Integration

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

Current MCP support in qwen-lyra:

- MCP exists as a tool (`mcp` tool)
- No lifecycle management (install, auth, resource listing)
- LSP exists as a tool (`lsp` tool) but not auto-discovered
- No per-project LSP configuration

Competitors:

- Codex: `mcp list`, `mcp show`, auth, resources, Codex Apps MCP server
- OpenCode: Auto-loads LSP per language

---

## Solution

Promote MCP and LSP from "tools" to first-class citizens with lifecycle management.

---

## Components

### 1. MCP Lifecycle Manager

**Purpose:** Full MCP server lifecycle beyond basic tool calls.

**Commands:**

```typescript
interface MCPLifecycle {
  // Discovery
  list(): Promise<MCPServer[]>;
  search(query: string): Promise<MCPServer[]>; // marketplace

  // Installation
  install(name: string, config?: object): Promise<void>;
  uninstall(name: string): Promise<void>;

  // Lifecycle
  start(name: string): Promise<void>;
  stop(name: string): Promise<void>;
  restart(name: string): Promise<void>;

  // Auth
  authenticate(name: string, credentials: object): Promise<void>;

  // Resources
  listResources(name: string): Promise<Resource[]>;
  readResource(name: string, uri: string): Promise<string>;
}
```

**Integration:**

- New slash commands: `/mcp list`, `/mcp install <name>`, `/mcp start <name>`
- Config section: `mcp.servers` in settings.json
- Auto-start configured servers on session start

---

### 2. MCP Marketplace

**Purpose:** Discover and install MCP servers from registry.

**Design:**

- Registry: JSON index of known MCP servers (official + community)
- Categories: filesystem, web, database, devtools, communication
- Rating system: install count, success rate
- Search: by name, category, capability

**Config:**

```json
{
  "mcp": {
    "registry": "https://mcp.qwen-code.dev/registry.json",
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx -y @modelcontextprotocol/server-filesystem"
      },
      "github": { "enabled": false }
    }
  }
}
```

---

### 3. LSP Auto-Discovery

**Purpose:** Auto-detect and start language servers per project.

**Detection rules:**

```typescript
const LSP_DETECTORS: Record<string, string[]> = {
  typescript: [
    'node_modules/.bin/typescript-language-server',
    'node_modules/.bin/tsserver',
  ],
  python: ['.venv/bin/pylsp', 'pipx run python-lsp-server'],
  rust: ['rustup run rust-analyzer'],
  go: ['gopls'],
  // ...
};

class LSPAutoDiscovery {
  detect(projectRoot: string): Promise<LSPServer[]>;
  // Scans for language-specific markers (package.json, Cargo.toml, go.mod, etc.)
}
```

**Integration:**

- Auto-start detected LSP on session start
- TUI shows active LSP servers in status line
- Diagnostics from LSP shown inline in code blocks

---

### 4. LSP Diagnostics in TUI

**Purpose:** Show errors/warnings inline without leaving terminal.

**Design:**

- LSP diagnostics piped to TUI
- Underline errors in code display (red for error, yellow for warning)
- Hover-like info on keypress (Ctrl+H)
- Jump to definition: Ctrl+Click or keybind

---

### 5. MCP + LSP Unified Health

**Purpose:** Single view of all external services.

**TUI panel:**

```
┌─ External Services ─────────────────────────┐
│ MCP Servers:                                 │
│   ✓ filesystem (running)                     │
│   ✗ github (stopped: auth required)            │
│                                              │
│ LSP Servers:                                 │
│   ✓ typescript-language-server (PID 12345)   │
│   ○ rust-analyzer (not detected)             │
└──────────────────────────────────────────────┘
```

---

## Files to Modify

- `packages/core/src/tools/mcp.ts` → expand to lifecycle
- `packages/core/src/lsp/` → new directory for LSP management
- `packages/cli/src/ui/` → add MCP/LSP status to TUI
- `packages/cli/src/commands/` → new slash commands

---

## Success Metrics

- MCP install success rate: target 90%+
- LSP auto-discovery accuracy: target 85%+
- Time to first diagnostic: target <5s after session start

---

## References

- Codex: `codex-rs/crates/mcp` and `codex-rs/crates/mcp-server`
- OpenCode: LSP auto-load implementation
