/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  QualityMonitor,
  ToolTrustManager,
  RetryTemperature,
} from './quality.js';

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
    const issues = monitor.checkTurn(
      'Here is my analysis of the codebase.',
      [],
    );
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

describe('ToolTrustManager', () => {
  it('returns all tools as available initially', () => {
    const trust = new ToolTrustManager();
    expect(trust.getAvailableTools()).toEqual([]);
  });

  it('tracks successful tool calls', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('read_file', true);
    expect(trust.getAvailableTools()).toContain('read_file');
  });

  it('disables tool after 3 consecutive failures', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    expect(trust.getAvailableTools()).not.toContain('edit');
  });

  it('re-enables tool after success', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', true);
    expect(trust.getAvailableTools()).toContain('edit');
  });

  it('tryAutoEnable does not re-enable when failCount >= threshold', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    expect(trust.getAvailableTools()).not.toContain('edit');

    // tryAutoEnable only re-enables when failCount < threshold
    const reEnabled = trust.tryAutoEnable();
    expect(reEnabled).toEqual([]);
    expect(trust.getAvailableTools()).not.toContain('edit');
  });
});

describe('RetryTemperature', () => {
  it('returns start temp on attempt 0', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(0)).toBe(0.1);
  });

  it('increases by step per attempt', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(1)).toBe(0.5);
    expect(temp.getTemperature(2)).toBe(0.9);
  });

  it('caps at 1.0', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(3)).toBe(1.0);
    expect(temp.getTemperature(10)).toBe(1.0);
  });

  it('uses custom start and step', () => {
    const temp = new RetryTemperature(0.2, 0.3);
    expect(temp.getTemperature(0)).toBe(0.2);
    expect(temp.getTemperature(1)).toBe(0.5);
    expect(temp.getTemperature(2)).toBe(0.8);
  });
});
