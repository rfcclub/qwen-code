/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TokenCount, Cost, ModelPricing } from './types.js';

export const PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet': { input: 3.0, output: 15.0, currency: 'USD' },
  'gpt-4o': { input: 2.5, output: 10.0, currency: 'USD' },
  'qwen-max': { input: 0.5, output: 2.0, currency: 'USD' },
  'qwen-7b-local': { input: 0, output: 0, currency: 'USD' },
  'qwen-14b-local': { input: 0, output: 0, currency: 'USD' },
};

export class CostCalculator {
  calculate(tokens: TokenCount, model: string): Cost {
    const pricing = PRICING[model];
    if (!pricing) {
      return { input: 0, output: 0, total: 0, currency: 'USD' };
    }

    const input = (tokens.prompt / 1_000_000) * pricing.input;
    const output = (tokens.completion / 1_000_000) * pricing.output;
    return {
      input,
      output,
      total: input + output,
      currency: pricing.currency,
    };
  }
}
