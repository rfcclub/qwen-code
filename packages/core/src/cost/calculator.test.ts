/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { CostCalculator, PRICING } from './calculator.js';
import type { TokenCount } from './types.js';

describe('CostCalculator', () => {
  const calc = new CostCalculator();

  it('calculates cost for known model', () => {
    const tokens: TokenCount = {
      prompt: 1_000_000,
      completion: 500_000,
      total: 1_500_000,
    };
    const cost = calc.calculate(tokens, 'qwen-max');
    expect(cost.currency).toBe('USD');
    expect(cost.input).toBe(0.5); // 1M * $0.5 per 1M
    expect(cost.output).toBe(1.0); // 500K * $2.0 per 1M
    expect(cost.total).toBe(1.5);
  });

  it('returns zero for free model', () => {
    const tokens: TokenCount = {
      prompt: 1_000_000,
      completion: 500_000,
      total: 1_500_000,
    };
    const cost = calc.calculate(tokens, 'qwen-7b-local');
    expect(cost.total).toBe(0);
  });

  it('handles unknown model gracefully', () => {
    const tokens: TokenCount = { prompt: 100, completion: 50, total: 150 };
    const cost = calc.calculate(tokens, 'unknown-model');
    expect(cost.total).toBe(0);
    expect(cost.currency).toBe('USD');
  });

  it('sums total correctly', () => {
    const tokens: TokenCount = {
      prompt: 2_000_000,
      completion: 1_000_000,
      total: 3_000_000,
    };
    const cost = calc.calculate(tokens, 'gpt-4o');
    expect(cost.input).toBe(5.0); // 2M * $2.5
    expect(cost.output).toBe(10.0); // 1M * $10.0
    expect(cost.total).toBe(15.0);
  });

  it('has pricing for common models', () => {
    expect(PRICING['qwen-max']).toBeDefined();
    expect(PRICING['claude-3-5-sonnet']).toBeDefined();
    expect(PRICING['gpt-4o']).toBeDefined();
  });
});
