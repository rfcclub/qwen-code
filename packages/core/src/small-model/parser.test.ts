/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ForgivingToolParser } from './parser.js';

describe('ForgivingToolParser', () => {
  const parser = new ForgivingToolParser();

  describe('strict JSON', () => {
    it('parses a single JSON tool call', () => {
      const input = '{"tool": "read_file", "params": {"path": "/tmp/a.txt"}}';
      const result = parser.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('read_file');
      expect(result[0]!.params).toEqual({ path: '/tmp/a.txt' });
      expect(result[0]!.confidence).toBe(1.0);
    });

    it('parses JSON array of tool calls', () => {
      const input =
        '[{"name": "grep_search", "params": {"pattern": "foo"}}, {"tool": "read_file", "params": {"path": "/b"}}]';
      const result = parser.parse(input);
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('grep_search');
      expect(result[1]!.name).toBe('read_file');
    });

    it('parses function-style schema', () => {
      const input =
        '{"tool": "run_shell_command", "params": {"command": "ls"}}';
      const result = parser.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('run_shell_command');
      expect(result[0]!.params).toEqual({ command: 'ls' });
    });
  });

  describe('repaired JSON', () => {
    it('fixes trailing commas in arrays', () => {
      const input = '[{"tool": "read_file", "params": {"path": "/a"},}]';
      const result = parser.parse(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('read_file');
      expect(result[0]!.confidence).toBe(0.8);
    });

    it('fixes trailing commas in objects', () => {
      const input = '{"tool": "edit", "params": {"a": 1,}}';
      const result = parser.parse(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('edit');
    });

    it('fixes unbalanced braces', () => {
      const input = '{"tool": "grep_search", "params": {"pattern": "x"}';
      const result = parser.parse(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('grep_search');
    });
  });

  describe('YAML-like', () => {
    it('parses basic YAML tool call', () => {
      const input = `tool: read_file
  path: /tmp/test.txt`;
      const result = parser.parse(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('read_file');
      expect(result[0]!.params).toHaveProperty('path');
      expect(result[0]!.confidence).toBe(0.6);
    });
  });

  describe('XML', () => {
    it('parses XML-style tool call', () => {
      const input =
        '<function><name>read_file</name><param name="path">/tmp/x.txt</param></function>';
      const result = parser.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('read_file');
      expect(result[0]!.params).toEqual({ path: '/tmp/x.txt' });
      expect(result[0]!.confidence).toBe(0.7);
    });
  });

  describe('plain text', () => {
    it('maps "search for" to grep_search', () => {
      const result = parser.parse('search for "foo" in the codebase');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('grep_search');
    });

    it('maps "read" to read_file', () => {
      const result = parser.parse('read /tmp/config.json');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('read_file');
    });

    it('maps "run" to run_shell_command', () => {
      const result = parser.parse('run npm test');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.name).toBe('run_shell_command');
    });
  });

  describe('fallback', () => {
    it('returns empty for unparseable input', () => {
      const result = parser.parse('just some random text with no tool');
      expect(result).toEqual([]);
    });
  });
});
