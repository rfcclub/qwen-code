/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen mcp install' command
import type { CommandModule } from 'yargs';
import { loadSettings, SettingScope } from '../../config/settings.js';
import { writeStdoutLine, writeStderrLine } from '../../utils/stdioHelpers.js';
import { MCPServerRegistry } from '@qwen-code/qwen-code-core';
import type { MCPServerConfig } from '@qwen-code/qwen-code-core';
import prompts from 'prompts';

const COLOR_CYAN = '\u001b[36m';
const COLOR_GREEN = '\u001b[32m';
const COLOR_YELLOW = '\u001b[33m';
const COLOR_RED = '\u001b[31m';
const COLOR_DIM = '\u001b[2m';
const RESET_COLOR = '\u001b[0m';

async function installMcpServer(
  name: string,
  options: {
    scope: string;
    env: string[] | undefined;
    timeout?: number;
    trust?: boolean;
    description?: string;
    includeTools?: string[];
    excludeTools?: string[];
  },
): Promise<void> {
  const registry = new MCPServerRegistry();
  const server = await registry.getByName(name);

  if (!server) {
    // Try search to suggest alternatives
    const results = await registry.search(name);
    if (results.length > 0) {
      writeStderrLine(
        `${COLOR_RED}Error:${RESET_COLOR} Server "${COLOR_YELLOW}${name}${RESET_COLOR}" not found in registry. Did you mean one of these?\n`,
      );
      for (const r of results.slice(0, 5)) {
        writeStderrLine(
          `  ${COLOR_CYAN}${r.name}${RESET_COLOR} — ${r.description.slice(0, 60)}`,
        );
      }
      writeStderrLine(
        `\n  Use ${COLOR_CYAN}qwen mcp search${RESET_COLOR} to browse the registry.\n`,
      );
    } else {
      writeStderrLine(
        `${COLOR_RED}Error:${RESET_COLOR} Server "${COLOR_YELLOW}${name}${RESET_COLOR}" not found in registry.\n` +
          `  Use ${COLOR_CYAN}qwen mcp add <name> <command>${RESET_COLOR} to add a custom server.\n`,
      );
    }
    process.exit(1);
  }

  // Build env vars from registry defaults + CLI overrides
  const env: Record<string, string> = { ...(server.env || {}) };
  const envOverrides = options.env || [];
  for (const e of envOverrides) {
    const eqIdx = e.indexOf('=');
    if (eqIdx > 0) {
      env[e.slice(0, eqIdx)] = e.slice(eqIdx + 1);
    }
  }

  // Check for required env vars that are still empty
  const emptyRequired = Object.entries(env).filter(([, v]) => !v);
  if (emptyRequired.length > 0) {
    writeStdoutLine(
      `\n${COLOR_YELLOW}Server "${server.name}" requires the following environment variables:${RESET_COLOR}\n`,
    );
    for (const [key] of emptyRequired) {
      const response = await prompts({
        type: 'text',
        name: 'value',
        message: `${key}`,
      });
      env[key] = response.value as string;
    }
    writeStdoutLine('');
  }

  const settings = loadSettings(process.cwd());
  const inHome = settings.workspace.path === settings.user.path;

  if (options.scope === 'project' && inHome) {
    writeStderrLine(
      'Error: Please use --scope user to edit settings in the home directory.',
    );
    process.exit(1);
  }

  const settingsScope =
    options.scope === 'user' ? SettingScope.User : SettingScope.Workspace;

  const newServer: Partial<MCPServerConfig> = {
    command: server.command,
    args: server.args,
    ...(Object.keys(env).length > 0 ? { env } : {}),
    ...(options.timeout ? { timeout: options.timeout } : {}),
    ...(options.trust !== undefined ? { trust: options.trust } : {}),
    ...(options.description || server.description
      ? { description: options.description || server.description }
      : {}),
    ...(options.includeTools ? { includeTools: options.includeTools } : {}),
    ...(options.excludeTools ? { excludeTools: options.excludeTools } : {}),
  };

  const existingSettings = settings.forScope(settingsScope).settings;
  const mcpServers = { ...(existingSettings.mcpServers || {}) };
  mcpServers[server.name] = newServer;
  settings.setValue(settingsScope, 'mcpServers', mcpServers);

  writeStdoutLine(
    `${COLOR_GREEN}✓${RESET_COLOR} Installed MCP server "${COLOR_CYAN}${server.name}${RESET_COLOR}"\n` +
      `  Command: ${COLOR_DIM}${server.command} ${server.args.join(' ')}${RESET_COLOR}\n` +
      `  Scope: ${COLOR_YELLOW}${options.scope}${RESET_COLOR}\n`,
  );

  if (
    (server.env && Object.keys(server.env).length > 0) ||
    Object.keys(env).length > 0
  ) {
    writeStdoutLine(
      `  ${COLOR_DIM}Environment: ${Object.entries(env)
        .map(([k, v]) => `${k}=${v ? '***' : '(empty)'}`)
        .join(', ')}${RESET_COLOR}\n`,
    );
  }

  if (server.homepage) {
    writeStdoutLine(`  ${COLOR_DIM}${server.homepage}${RESET_COLOR}\n`);
  }
}

export const installCommand: CommandModule = {
  command: 'install <name>',
  describe: 'Install an MCP server from the registry',
  builder: (yargs) =>
    yargs
      .usage('Usage: qwen mcp install [options] <name>')
      .positional('name', {
        describe: 'Name of the server in the registry',
        type: 'string',
        demandOption: true,
      })
      .option('scope', {
        alias: 's',
        describe: 'Configuration scope (user or project)',
        type: 'string',
        default: 'user',
        choices: ['user', 'project'],
      })
      .option('env', {
        alias: 'e',
        describe: 'Set environment variables (e.g. -e KEY=value)',
        type: 'array',
        string: true,
        nargs: 1,
      })
      .option('timeout', {
        describe: 'Set connection timeout in milliseconds',
        type: 'number',
      })
      .option('trust', {
        describe:
          'Trust the server (bypass all tool call confirmation prompts)',
        type: 'boolean',
      })
      .option('description', {
        describe: 'Override the description for the server',
        type: 'string',
      })
      .option('include-tools', {
        describe: 'A comma-separated list of tools to include',
        type: 'array',
        string: true,
      })
      .option('exclude-tools', {
        describe: 'A comma-separated list of tools to exclude',
        type: 'array',
        string: true,
      }),
  handler: async (argv) => {
    await installMcpServer(argv['name'] as string, {
      scope: argv['scope'] as string,
      env: argv['env'] as string[] | undefined,
      timeout: argv['timeout'] as number | undefined,
      trust: argv['trust'] as boolean | undefined,
      description: argv['description'] as string | undefined,
      includeTools: argv['include-tools'] as string[] | undefined,
      excludeTools: argv['exclude-tools'] as string[] | undefined,
    });
  },
};
