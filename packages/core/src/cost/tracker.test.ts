/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SessionCostTracker } from './tracker.js';
import type { TokenCount } from './types.js';

describe('SessionCostTracker', () => {
  const tracker = new SessionCostTracker('session-1');

  it('starts with zero cost', () => {
    const current = tracker.getCurrentSpend();
    expect(current.total).toBe(0);
  });

  it('logs request and accumulates cost', () => {
    const tokens: TokenCount = {
      prompt: 1_000_000,
      completion: 500_000,
      total: 1_500_000,
    };
    tracker.logRequest('qwen-max', tokens);
    const spend = tracker.getCurrentSpend();
    expect(spend.total).toBeGreaterThan(0);
  });

  it('returns session cost summary', () => {
    const tokens: TokenCount = {
      prompt: 2_000_000,
      completion: 1_000_000,
      total: 3_000_000,
    };
    tracker.logRequest('qwen-max', tokens);
    const summary = tracker.getSummary();
    expect(summary.sessionId).toBe('session-1');
    expect(summary.requests.length).toBe(2);
    expect(summary.totalTokens.total).toBe(4_500_000);
  });

  it('tracks multiple models', () => {
    const tracker2 = new SessionCostTracker('session-2');
    tracker2.logRequest('qwen-max', {
      prompt: 1_000_000,
      completion: 0,
      total: 1_000_000,
    });
    tracker2.logRequest('gpt-4o', {
      prompt: 1_000_000,
      completion: 0,
      total: 1_000_000,
    });
    const summary = tracker2.getSummary();
    expect(summary.requests.length).toBe(2);
  });
});
