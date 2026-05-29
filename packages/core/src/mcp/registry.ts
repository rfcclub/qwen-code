/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MCPRegistryIndex, MCPRegistryServer } from './registry-types.js';

/**
 * Default bundled registry index.
 *
 * Contains well-known MCP servers maintained by the community.
 * Updated infrequently — users can point to a custom registry URL
 * via settings if they want a live index.
 */
const DEFAULT_INDEX: MCPRegistryIndex = {
  version: '1.0.0',
  updated: '2026-05-29',
  servers: [
    {
      name: 'filesystem',
      title: 'Filesystem',
      description:
        'Secure file operations with configurable access controls. Read, write, move, search files within allowed directories.',
      categories: ['filesystem', 'devtools'],
      installCommand: 'npx -y @modelcontextprotocol/server-filesystem <path>',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
    },
    {
      name: 'github',
      title: 'GitHub',
      description:
        'GitHub API integration — manage repos, issues, PRs, reviews, and search code.',
      categories: ['devtools', 'version-control'],
      installCommand: 'npx -y @modelcontextprotocol/server-github',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: '' },
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'git',
      title: 'Git',
      description:
        'Git operations: status, diff, log, blame, and staged-file inspection.',
      categories: ['devtools', 'version-control'],
      installCommand: 'npx -y @modelcontextprotocol/server-git',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'postgres',
      title: 'PostgreSQL',
      description:
        'Read-only database access with schema inspection and query execution.',
      categories: ['database'],
      installCommand:
        'npx -y @modelcontextprotocol/server-postgres <connection-string>',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'sqlite',
      title: 'SQLite',
      description: 'SQLite database exploration and read-only queries.',
      categories: ['database'],
      installCommand: 'npx -y @modelcontextprotocol/server-sqlite <db-path>',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'brave-search',
      title: 'Brave Search',
      description:
        'Web search via Brave Search API with configurable result count.',
      categories: ['web', 'search'],
      installCommand: 'npx -y @modelcontextprotocol/server-brave-search',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: '' },
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'puppeteer',
      title: 'Puppeteer',
      description:
        'Browser automation — navigate, screenshot, click, and extract page content.',
      categories: ['web', 'devtools'],
      installCommand: 'npx -y @modelcontextprotocol/server-puppeteer',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'memory',
      title: 'Memory (Knowledge Graph)',
      description:
        'Persistent knowledge graph-based memory using local JSON files.',
      categories: ['memory', 'ai'],
      installCommand: 'npx -y @modelcontextprotocol/server-memory',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      homepage: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'mcp-link',
      title: 'MCP Link',
      description:
        'MCP server multiplexer — run multiple servers through a single daemon process.',
      categories: ['devtools', 'infrastructure'],
      installCommand: 'npx -y @agentico/mcp-link',
      command: 'npx',
      args: ['-y', '@agentico/mcp-link'],
      homepage: 'https://github.com/agentico-dev/mcp-link',
    },
    {
      name: 'playwright',
      title: 'Playwright',
      description:
        'Browser automation with Playwright — full page interaction and testing.',
      categories: ['web', 'testing'],
      installCommand: 'npx -y @playwright/mcp',
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
      homepage: 'https://github.com/microsoft/playwright-mcp',
    },
  ],
};

/**
 * MCP Server Registry — discovers available MCP servers.
 *
 * Ships with a bundled index of well-known servers. Can optionally
 * load from a remote registry URL for a live, community-driven index.
 */
export class MCPServerRegistry {
  private index: MCPRegistryIndex | null = null;
  private registryUrl: string | undefined;

  constructor(registryUrl?: string) {
    this.registryUrl = registryUrl;
  }

  /**
   * Load the registry. Uses bundled index by default.
   * If registryUrl is set, tries to fetch from remote; falls back to bundled.
   */
  async load(): Promise<MCPRegistryIndex> {
    if (this.index) return this.index;

    if (this.registryUrl) {
      try {
        const response = await fetch(this.registryUrl);
        if (response.ok) {
          this.index = (await response.json()) as MCPRegistryIndex;
          return this.index;
        }
      } catch {
        // Fall through to bundled
      }
    }

    this.index = DEFAULT_INDEX;
    return this.index;
  }

  /**
   * Search servers by name, keyword, or category.
   */
  async search(query: string): Promise<MCPRegistryServer[]> {
    const index = await this.load();
    const q = query.toLowerCase();
    return index.servers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q)),
    );
  }

  /**
   * Search by category.
   */
  async searchByCategory(category: string): Promise<MCPRegistryServer[]> {
    const index = await this.load();
    const c = category.toLowerCase();
    return index.servers.filter((s) =>
      s.categories.some((cat) => cat.toLowerCase() === c),
    );
  }

  /**
   * Look up a server by exact name.
   */
  async getByName(name: string): Promise<MCPRegistryServer | undefined> {
    const index = await this.load();
    return index.servers.find((s) => s.name === name);
  }

  /**
   * List all servers in the registry.
   */
  async list(): Promise<MCPRegistryServer[]> {
    const index = await this.load();
    return index.servers;
  }

  /**
   * Get all available categories.
   */
  async getCategories(): Promise<string[]> {
    const index = await this.load();
    const cats = new Set<string>();
    for (const s of index.servers) {
      for (const c of s.categories) cats.add(c);
    }
    return [...cats].sort();
  }
}
