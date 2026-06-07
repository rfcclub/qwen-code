/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { QualityMonitor } from './quality-monitor.js';

describe('QualityMonitor', () => {
  const tools = ['read_file', 'write_file', 'grep_search', 'edit'];
  const monitor = new QualityMonitor(tools);

  it('flags empty turn with no tool calls', () => {
    const issues = monitor.checkTurn('', []);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.type).toBe('empty_turn');
    expect(issues[0]!.severity).toBe('error');
  });

  it('flags empty turn with short text', () => {
    const issues = monitor.checkTurn('ok', []);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.type).toBe('empty_turn');
  });

  it('does not flag turn with meaningful text', () => {
    const issues = monitor.checkTurn('Here is my analysis.', []);
    expect(issues).toHaveLength(0);
  });

  it('does not flag turn with tool calls', () => {
    const issues = monitor.checkTurn('', [{ name: 'read_file', params: {} }]);
    expect(issues).toHaveLength(0);
  });

  it('flags hallucinated tool names', () => {
    const issues = monitor.checkTurn('', [{ name: 'magic_tool', params: {} }]);
    expect(issues.some((i) => i.type === 'hallucinated_tool')).toBe(true);
  });

  it('does not flag valid tool names', () => {
    const issues = monitor.checkTurn('', [
      { name: 'read_file', params: { path: '/a' } },
    ]);
    expect(issues.some((i) => i.type === 'hallucinated_tool')).toBe(false);
  });

  it('flags duplicate tool calls', () => {
    const call = { name: 'read_file', params: { path: '/a' } };
    monitor.checkTurn('', [call]);
    const issues = monitor.checkTurn('', [call]);
    expect(issues.some((i) => i.type === 'repeat_call')).toBe(true);
  });

  it('isValidTool works', () => {
    expect(monitor.isValidTool('read_file')).toBe(true);
    expect(monitor.isValidTool('fake_tool')).toBe(false);
  });
});
