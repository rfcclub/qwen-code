/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ForgivingToolParser } from './tool-parser.js';

describe('tool-parser re-export', () => {
  const parser = new ForgivingToolParser();

  it('parses JSON tool calls', () => {
    const input = '{"tool": "read_file", "params": {"path": "/tmp/a.txt"}}';
    const result = parser.parse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('read_file');
  });

  it('parses plain text tool calls', () => {
    const result = parser.parse('search for "foo" in the codebase');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.name).toBe('grep_search');
  });
});
