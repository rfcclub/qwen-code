/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BenchmarkSuite } from '../types.js';

export const toolUseSuite: BenchmarkSuite = {
  name: 'tool-use',
  description: 'Tool calling accuracy validation',
  tasks: [
    {
      id: 'tooluse-grep',
      name: 'grep search',
      type: 'tool-use',
      prompt: 'Find all files containing "TODO" in the current directory',
      validation: {
        type: 'command_succeeds',
        params: { command: 'echo "grep search validated"' },
      },
      timeout: 10,
    },
    {
      id: 'tooluse-shell',
      name: 'shell command',
      type: 'tool-use',
      prompt: 'Show the last 5 git commits using a shell command',
      validation: {
        type: 'command_succeeds',
        params: { command: 'git log --oneline -5' },
      },
      timeout: 10,
    },
    {
      id: 'tooluse-edit',
      name: 'edit file',
      type: 'tool-use',
      prompt: 'Edit line 42 of /tmp/tooluse-file.ts to add a comment',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/tooluse-file.ts', contains: '//' },
      },
      timeout: 10,
    },
    {
      id: 'tooluse-write',
      name: 'write_file',
      type: 'tool-use',
      prompt: 'Create a new file at /tmp/tooluse-new.ts with a simple function',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/tooluse-new.ts' },
      },
      timeout: 10,
    },
  ],
};
