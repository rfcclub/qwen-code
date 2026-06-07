/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BenchmarkSuite } from './types.js';

export const smokeSuite: BenchmarkSuite = {
  name: 'smoke',
  description: 'Quick sanity checks for basic functionality',
  tasks: [
    {
      id: 'smoke-1',
      name: 'echo hello',
      type: 'smoke',
      prompt: 'Run the command `echo hello` and verify output',
      validation: {
        type: 'command_succeeds',
        params: { command: 'echo hello' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-2',
      name: 'file read/write',
      type: 'smoke',
      prompt: 'Write "hello world" to /tmp/smoke-test.txt and read it back',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/smoke-test.txt', contains: 'hello world' },
      },
      timeout: 5,
    },
  ],
};

export const polyglotSuite: BenchmarkSuite = {
  name: 'polyglot',
  description: 'Multi-language code generation tasks',
  tasks: [
    {
      id: 'polyglot-1',
      name: 'Python sort function',
      type: 'polyglot',
      prompt: 'Write a Python function that sorts a list of integers',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-sort.py' },
      },
      timeout: 30,
    },
    {
      id: 'polyglot-2',
      name: 'TypeScript class',
      type: 'polyglot',
      prompt: 'Write a TypeScript class with an interface',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-class.ts' },
      },
      timeout: 30,
    },
  ],
};

export const toolUseSuite: BenchmarkSuite = {
  name: 'tool-use',
  description: 'Tool calling accuracy validation',
  tasks: [
    {
      id: 'tooluse-1',
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
      id: 'tooluse-2',
      name: 'git log',
      type: 'tool-use',
      prompt: 'Show the last 5 commits',
      validation: {
        type: 'command_succeeds',
        params: { command: 'git log --oneline -5' },
      },
      timeout: 10,
    },
  ],
};
