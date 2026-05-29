# Design: Plugin System with Hooks

**Status:** Design
**Date:** 2026-05-28
**Priority:** P1

---

## Problem

Current extensibility in qwen-lyra is limited to:

- Skills (bundled, limited customizability)
- Tools (built-in only)
- No third-party plugins

Competitors:

- OpenCode: Plugin system with lifecycle hooks
- Claw Code: Plugin install/enable/disable with metadata
- SmallCode: Plugin system for tools, commands, providers

---

## Solution

Build a plugin system with lifecycle hooks, allowing third-party extensions.

---

## Components

### 1. Plugin Manifest

```typescript
interface PluginManifest {
  name: string; // unique identifier
  version: string;
  description: string;
  author: string;
  entry: string; // main file path

  hooks: HookName[]; // which hooks this plugin uses

  // Capabilities
  provides?: {
    tools?: string[];
    commands?: string[];
    providers?: string[];
    mcpServers?: string[];
  };

  // Dependencies
  requires?: string[]; // other plugin names
  compatibleWith?: string; // qwen-lyra version range
}
```

**Example:**

```json
{
  "name": "docker-helper",
  "version": "1.0.0",
  "description": "Docker-compose and Dockerfile assistance",
  "author": "docker-fan",
  "entry": "index.js",
  "hooks": ["pre-request", "session-start"],
  "provides": {
    "tools": ["docker_inspect", "docker_logs"]
  }
}
```

---

### 2. Hook System

```typescript
type HookName =
  | 'session-start' // new session begins
  | 'session-end' // session ends
  | 'pre-request' // before LLM request
  | 'post-request' // after LLM response
  | 'pre-tool' // before tool execution
  | 'post-tool' // after tool execution
  | 'error' // when error occurs
  | 'command'; // custom slash command

interface HookContext {
  session: Session;
  config: Config;
  // Hook-specific data
}

type HookHandler = (context: HookContext, data: unknown) => Promise<void>;
```

---

### 3. Plugin Registry

```typescript
class PluginRegistry {
  // Discovery
  listInstalled(): PluginManifest[];
  searchMarketplace(query: string): Promise<PluginManifest[]>;

  // Lifecycle
  install(name: string): Promise<void>;
  uninstall(name: string): Promise<void>;
  enable(name: string): Promise<void>;
  disable(name: string): Promise<void>;

  // Execution
  runHook(name: HookName, context: HookContext, data: unknown): Promise<void>;
  getTool(name: string): Tool | undefined;
  getCommand(name: string): Command | undefined;
}
```

---

### 4. Installation

**From marketplace:**

```bash
qwen plugin install docker-helper
```

**From local:**

```bash
qwen plugin install ./my-plugin
```

**From git:**

```bash
qwen plugin install github.com/user/my-plugin
```

**Storage:**

```
~/.config/qwen-lyra/plugins/
├── docker-helper/
│   ├── manifest.json
│   ├── index.js
│   └── ...
```

---

### 5. Built-in vs External Plugins

**Built-in plugins (bundled):**

- `@qwen-code/core-tools`
- `@qwen-code/skills`
- `@qwen-code/mcp-client`

**External plugins (user-installed):**

- `docker-helper`
- `kubernetes-tools`
- `custom-provider`

---

### 6. Security

**Sandbox:**

- Plugins run in isolated context (VM2 or similar)
- No direct filesystem access (only through approved APIs)
- Network access requires explicit permission
- No access to API keys or secrets

**Review:**

- Marketplace plugins: automated scan for malicious code
- Community rating system
- Verified badge for official plugins

---

### 7. Slash Commands from Plugins

Plugins can register custom slash commands:

```typescript
// In plugin code
registerCommand('/docker-compose', async (args, context) => {
  // Generate docker-compose.yml based on project structure
  const project = await context.tools.readFile('package.json');
  const compose = generateCompose(project);
  await context.tools.writeFile('docker-compose.yml', compose);
});
```

---

## Files to Create

```
packages/plugin/
├── src/
│   ├── manifest.ts
│   ├── registry.ts
│   ├── hooks.ts
│   ├── installer.ts
│   ├── sandbox.ts
│   └── api.ts          // exposed to plugins
├── package.json
└── tsconfig.json
```

---

## Success Metrics

- Plugin install success rate: target 90%+
- Plugin load time: target <100ms
- Zero security incidents from plugins
- 10+ community plugins within 3 months of launch

---

## References

- Claw Code: `~/repo/claw-code/crates/plugins`
- OpenCode: plugin system implementation
