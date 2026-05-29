# Delta Spec: MCP Marketplace

**Parent:** gap-3-mcp-lsp-integration.md
**Date:** 2026-05-29
**Status:** Implementation

## What Changed

Original design assumed zero MCP infrastructure. Reality: MCP lifecycle management (list/add/remove/reconnect), OAuth, health monitoring, and TUI dialog already exist. The real gap is **MCP marketplace** — discovery of available servers from a registry.

## Scope

### 1. MCP Registry (core)

- `MCPRegistryServer` interface: name, description, categories, command, args, env, homepage, install count
- `MCPServerRegistry` class: load from URL or bundled JSON, search by name/category, get install config
- Default bundled registry with 10 popular MCP servers
- `--registry` config option pointing to custom registry URL

### 2. `qwen mcp search` (CLI)

- Search registry by keyword or category
- Display results: name, description, category, install count
- `qwen mcp search filesystem` → list filesystem-related servers
- `qwen mcp search --category database` → all database servers

### 3. Enhanced `qwen mcp install` (CLI)

- `qwen mcp install filesystem` → looks up "filesystem" in registry, fills command/args from registry entry
- Falls back to existing add behavior if name not found in registry

## Non-Goals

- MCP server publishing/submission UI
- Versioned registries
- User ratings/comments
- Private registries (future)

## Implementation Plan

1. `packages/core/src/mcp/registry-types.ts` — interfaces
2. `packages/core/src/mcp/registry.ts` — MCPServerRegistry class + bundled index
3. `packages/cli/src/commands/mcp/search.ts` — search command
4. `packages/cli/src/commands/mcp.ts` — register search subcommand
5. `packages/cli/src/commands/mcp/add.ts` — registry lookup fallback
