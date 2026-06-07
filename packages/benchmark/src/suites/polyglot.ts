/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BenchmarkSuite } from '../types.js';

export const polyglotSuite: BenchmarkSuite = {
  name: 'polyglot',
  description: 'Multi-language code generation tasks',
  tasks: [
    {
      id: 'polyglot-py-sort',
      name: 'Python sort function',
      type: 'polyglot',
      prompt:
        'Write a Python function that sorts a list of integers in ascending order',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-sort.py' },
      },
      timeout: 30,
    },
    {
      id: 'polyglot-ts-class',
      name: 'TypeScript class with interface',
      type: 'polyglot',
      prompt:
        'Write a TypeScript class User with an interface IUser { id: number; name: string }',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-user.ts' },
      },
      timeout: 30,
    },
    {
      id: 'polyglot-rust-error',
      name: 'Rust error handling',
      type: 'polyglot',
      prompt:
        'Write a Rust function that parses an integer and returns Result<i32, String>',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-parse.rs' },
      },
      timeout: 30,
    },
    {
      id: 'polyglot-go-handler',
      name: 'Go HTTP handler',
      type: 'polyglot',
      prompt: 'Write a Go HTTP handler that responds with JSON {"status":"ok"}',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-handler.go' },
      },
      timeout: 30,
    },
    {
      id: 'polyglot-sql-join',
      name: 'SQL JOIN query',
      type: 'polyglot',
      prompt: 'Write a SQL query that joins users and orders tables on user_id',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/polyglot-query.sql' },
      },
      timeout: 30,
    },
  ],
};
