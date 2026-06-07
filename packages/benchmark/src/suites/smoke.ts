/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BenchmarkSuite } from '../types.js';

export const smokeSuite: BenchmarkSuite = {
  name: 'smoke',
  description: 'Quick sanity checks for basic functionality',
  tasks: [
    {
      id: 'smoke-ls',
      name: 'ls command',
      type: 'smoke',
      prompt: 'List the current directory contents',
      validation: {
        type: 'command_succeeds',
        params: { command: 'ls' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-read',
      name: 'read_file',
      type: 'smoke',
      prompt: 'Read the file at /tmp/smoke-read.txt and report its contents',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/smoke-read.txt', contains: 'hello world' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-write',
      name: 'write_file',
      type: 'smoke',
      prompt: 'Write "hello world" to /tmp/smoke-write.txt',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/smoke-write.txt', contains: 'hello world' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-edit',
      name: 'edit',
      type: 'smoke',
      prompt: 'Edit /tmp/smoke-edit.txt to replace "old" with "new"',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/smoke-edit.txt', contains: 'new' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-shell',
      name: 'shell execution',
      type: 'smoke',
      prompt: 'Run a shell command that creates /tmp/smoke-shell.txt',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/smoke-shell.txt' },
      },
      timeout: 5,
    },
  ],
};
