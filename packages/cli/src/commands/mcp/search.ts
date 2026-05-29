/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen mcp search' command
import type { CommandModule } from 'yargs';
import { writeStdoutLine } from '../../utils/stdioHelpers.js';
import { MCPServerRegistry } from '@qwen-code/qwen-code-core';
import type { MCPRegistryServer } from '@qwen-code/qwen-code-core';

const COLOR_CYAN = '\u001b[36m';
const COLOR_YELLOW = '\u001b[33m';
const COLOR_GREEN = '\u001b[32m';
const COLOR_DIM = '\u001b[2m';
const RESET_COLOR = '\u001b[0m';

const COL_WIDTH = 20;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

async function searchRegistry(
  query: string | undefined,
  category: string | undefined,
): Promise<void> {
  const registry = new MCPServerRegistry();

  if (category) {
    const results = await registry.searchByCategory(category);
    writeStdoutLine(
      `\n${COLOR_GREEN}${results.length}${RESET_COLOR} server(s) found in category "${COLOR_CYAN}${category}${RESET_COLOR}":\n`,
    );
    printServers(results);
    return;
  }

  if (!query) {
    // List all
    const all = await registry.list();
    const cats = await registry.getCategories();
    writeStdoutLine(
      `\n${COLOR_GREEN}${all.length}${RESET_COLOR} server(s) available in registry. Categories: ${cats.map((c) => `${COLOR_YELLOW}${c}${RESET_COLOR}`).join(', ')}\n`,
    );
    printServers(all);
    return;
  }

  const results = await registry.search(query);
  if (results.length === 0) {
    writeStdoutLine(
      `\nNo servers found matching "${COLOR_YELLOW}${query}${RESET_COLOR}". Try a different keyword or use ${COLOR_CYAN}qwen mcp search${RESET_COLOR} to list all.\n`,
    );
    return;
  }

  writeStdoutLine(
    `\n${COLOR_GREEN}${results.length}${RESET_COLOR} server(s) matching "${COLOR_YELLOW}${query}${RESET_COLOR}":\n`,
  );
  printServers(results);
}

function printServers(servers: MCPRegistryServer[]): void {
  for (const s of servers) {
    const name = truncate(s.name, COL_WIDTH).padEnd(COL_WIDTH);
    const cats = s.categories
      .map((c) => `${COLOR_DIM}${c}${RESET_COLOR}`)
      .join(', ');
    writeStdoutLine(
      `  ${COLOR_CYAN}${name}${RESET_COLOR} ${truncate(s.description, 60)}`,
    );
    writeStdoutLine(`  ${' '.repeat(COL_WIDTH)} ${cats}`);
    writeStdoutLine(
      `  ${' '.repeat(COL_WIDTH)} ${COLOR_DIM}${s.installCommand}${RESET_COLOR}`,
    );
    writeStdoutLine('');
  }
  writeStdoutLine(
    `  ${COLOR_DIM}Install: qwen mcp install <server-name>${RESET_COLOR}\n`,
  );
}

export const searchCommand: CommandModule = {
  command: 'search [query]',
  describe: 'Search the MCP server registry',
  builder: (yargs) =>
    yargs
      .positional('query', {
        type: 'string',
        description: 'Search keyword (name, description, or category)',
      })
      .option('category', {
        type: 'string',
        alias: 'c',
        description: 'Filter by category (e.g., database, devtools, web)',
      }),
  handler: async (argv) => {
    await searchRegistry(
      argv['query'] as string | undefined,
      argv['category'] as string | undefined,
    );
  },
};
