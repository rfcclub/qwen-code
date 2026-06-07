/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Argv, CommandModule } from 'yargs';
import { ProfileManager } from '@qwen-code/qwen-code-core';
import { writeStderrLine, writeStdoutLine } from '../utils/stdioHelpers.js';
import { getErrorMessage } from '../utils/errors.js';
import prompts from 'prompts';

const createCommand: CommandModule = {
  command: 'create <name>',
  describe: 'Create a new identity profile interactively',
  builder: (yargs: Argv) =>
    yargs.positional('name', {
      type: 'string',
      description: 'Profile name',
    }),
  handler: async (argv) => {
    try {
      const name = argv['name'] as string;
      const manager = new ProfileManager();
      manager.createDefaultProfiles();
      if (manager.list().includes(name)) {
        writeStderrLine(`Profile "${name}" already exists.`);
        process.exit(1);
      }

      const response = await prompts([
        {
          type: 'text',
          name: 'globalInitPrompts',
          message:
            'Global init prompt files (comma-separated paths, optional):',
        },
        {
          type: 'text',
          name: 'appendSystemPrompt',
          message: 'Append system prompt (optional):',
        },
      ]);

      const globalInitPrompts = response.globalInitPrompts
        ? String(response.globalInitPrompts)
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        : [];

      const profile = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        globalInitPrompts:
          globalInitPrompts.length > 0 ? globalInitPrompts : undefined,
        appendSystemPrompt: response.appendSystemPrompt
          ? String(response.appendSystemPrompt)
          : undefined,
      };

      manager.save(name, profile);
      writeStdoutLine(
        `Profile "${name}" created at ${manager.getProfilesDir()}/${name}.json`,
      );
    } catch (err) {
      writeStderrLine(getErrorMessage(err));
      process.exit(1);
    }
  },
};

const listCommand: CommandModule = {
  command: 'list',
  describe: 'List available identity profiles',
  builder: (yargs: Argv) => yargs,
  handler: () => {
    try {
      const manager = new ProfileManager();
      manager.createDefaultProfiles();
      const profiles = manager.list();
      if (profiles.length === 0) {
        writeStdoutLine('No profiles found.');
        return;
      }
      for (const name of profiles) {
        writeStdoutLine(name);
      }
    } catch (err) {
      writeStderrLine(getErrorMessage(err));
      process.exit(1);
    }
  },
};

const showCommand: CommandModule = {
  command: 'show <name>',
  describe: 'Show profile contents',
  builder: (yargs: Argv) =>
    yargs.positional('name', {
      type: 'string',
      description: 'Profile name',
    }),
  handler: (argv) => {
    try {
      const name = argv['name'] as string;
      const manager = new ProfileManager();
      manager.createDefaultProfiles();
      const profile = manager.load(name);
      writeStdoutLine(JSON.stringify(profile, null, 2));
    } catch (err) {
      writeStderrLine(getErrorMessage(err));
      process.exit(1);
    }
  },
};

const deleteCommand: CommandModule = {
  command: 'delete <name>',
  describe: 'Delete an identity profile',
  builder: (yargs: Argv) =>
    yargs.positional('name', {
      type: 'string',
      description: 'Profile name',
    }),
  handler: (argv) => {
    try {
      const name = argv['name'] as string;
      const manager = new ProfileManager();
      manager.delete(name);
      writeStdoutLine(`Profile "${name}" deleted.`);
    } catch (err) {
      writeStderrLine(getErrorMessage(err));
      process.exit(1);
    }
  },
};

export const profileCommand: CommandModule = {
  command: 'profile',
  describe: 'Manage identity profiles',
  builder: (yargs: Argv) =>
    yargs
      .command(createCommand)
      .command(listCommand)
      .command(showCommand)
      .command(deleteCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // yargs shows help if no subcommand
  },
};
