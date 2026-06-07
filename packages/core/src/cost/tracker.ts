/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TokenCount, SessionCost, RequestCost } from './types.js';
import { CostCalculator } from './calculator.js';

export class SessionCostTracker {
  private sessionId: string;
  private startTime: string;
  private requests: RequestCost[] = [];
  private calculator = new CostCalculator();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = new Date().toISOString();
  }

  logRequest(model: string, tokens: TokenCount): void {
    const cost = this.calculator.calculate(tokens, model);
    this.requests.push({
      timestamp: new Date().toISOString(),
      model,
      tokens,
      cost,
    });
  }

  getCurrentSpend() {
    return this.requests.reduce(
      (acc, r) => ({
        input: acc.input + r.cost.input,
        output: acc.output + r.cost.output,
        total: acc.total + r.cost.total,
        currency: r.cost.currency,
      }),
      { input: 0, output: 0, total: 0, currency: 'USD' },
    );
  }

  getSummary(): SessionCost {
    const totalTokens = this.requests.reduce(
      (acc, r) => ({
        prompt: acc.prompt + r.tokens.prompt,
        completion: acc.completion + r.tokens.completion,
        total: acc.total + r.tokens.total,
      }),
      { prompt: 0, completion: 0, total: 0 },
    );

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      requests: this.requests,
      totalTokens,
      totalCost: this.getCurrentSpend(),
    };
  }
}
