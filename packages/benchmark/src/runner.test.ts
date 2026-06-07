/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from './runner.js';
import type { BenchmarkSuite } from './types.js';

const mockSuite: BenchmarkSuite = {
  name: 'smoke',
  description: 'Quick sanity checks',
  tasks: [
    {
      id: 'smoke-1',
      name: 'echo hello',
      type: 'smoke',
      prompt: 'Run echo hello',
      validation: {
        type: 'command_succeeds',
        params: { command: 'echo hello' },
      },
      timeout: 5,
    },
    {
      id: 'smoke-2',
      name: 'file create',
      type: 'smoke',
      prompt: 'Create /tmp/bench-test.txt with content hello',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/bench-test.txt', contains: 'hello' },
      },
      timeout: 5,
    },
  ],
};

describe('BenchmarkRunner', () => {
  const runner = new BenchmarkRunner();

  it('runs a suite and returns results', async () => {
    const report = await runner.run(mockSuite, 'qwen-7b');
    expect(report.model).toBe('qwen-7b');
    expect(report.results).toHaveLength(2);
    expect(report.timestamp).toBeDefined();
  });

  it('calculates pass rate', async () => {
    const report = await runner.run(mockSuite, 'qwen-7b');
    expect(report.passRate).toBeGreaterThanOrEqual(0);
    expect(report.passRate).toBeLessThanOrEqual(100);
  });

  it('calculates avg duration', async () => {
    const report = await runner.run(mockSuite, 'qwen-7b');
    expect(report.avgDuration).toBeGreaterThanOrEqual(0);
  });

  it('tracks retries per task', async () => {
    const report = await runner.run(mockSuite, 'qwen-7b');
    report.results.forEach((r) => {
      expect(r.retries).toBeGreaterThanOrEqual(0);
    });
  });

  it('runAll merges multiple suites', async () => {
    const suites = [mockSuite, { ...mockSuite, name: 'polyglot', tasks: [] }];
    const report = await runner.runAll(suites, 'qwen-7b');
    expect(report.results.length).toBe(2);
  });

  it('handles empty suite', async () => {
    const empty: BenchmarkSuite = {
      name: 'empty',
      description: 'x',
      tasks: [],
    };
    const report = await runner.run(empty, 'qwen-7b');
    expect(report.passRate).toBe(100);
    expect(report.avgDuration).toBe(0);
  });

  it('handles timeout', async () => {
    const slowSuite: BenchmarkSuite = {
      name: 'slow',
      description: 'x',
      tasks: [
        {
          id: 'slow-1',
          name: 'never completes',
          type: 'smoke',
          prompt: 'x',
          validation: {
            type: 'custom',
            params: {
              fn: () =>
                new Promise<boolean>(() => {
                  // never resolves
                }),
            },
          },
          timeout: 1,
        },
      ],
    };
    const report = await runner.run(slowSuite, 'qwen-7b');
    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].error).toContain('Timeout');
  });

  it('computes cost when token usage and costPerToken provided', async () => {
    const suite: BenchmarkSuite = {
      name: 'cost',
      description: 'x',
      tasks: [
        {
          id: 'cost-1',
          name: 'echo',
          type: 'smoke',
          prompt: 'x',
          validation: {
            type: 'command_succeeds',
            params: { command: 'echo hello' },
          },
          timeout: 5,
        },
      ],
    };
    const report = await runner.run(suite, 'qwen-7b', {
      tokenUsage: 1000,
      costPerToken: 0.002,
    });
    expect(report.results[0].cost).toBe(2);
    expect(report.totalCost).toBe(2);
  });
});
