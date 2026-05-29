/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { TokenBudgetManager, capToolResult } from './budget.js';

describe('TokenBudgetManager', () => {
  describe('getBudget', () => {
    it('returns correct budget for a 32K model', () => {
      const mgr = new TokenBudgetManager(32_768);
      const budget = mgr.getBudget();
      expect(budget.maxTokens).toBe(32_768);
      expect(budget.reservedForResponse).toBe(4096);
      expect(budget.reservedForTools).toBe(4096);
      expect(budget.availableForContext).toBe(24_576);
    });

    it('uses custom reserved values', () => {
      const mgr = new TokenBudgetManager(16_000, {
        tokenBudgetReservedForResponse: 2048,
        tokenBudgetReservedForTools: 1024,
      });
      const budget = mgr.getBudget();
      expect(budget.availableForContext).toBe(12_928);
    });
  });

  describe('estimateTokenCount', () => {
    it('returns ceil(length / 4)', () => {
      const mgr = new TokenBudgetManager(32_768);
      expect(mgr.estimateTokenCount('abcd')).toBe(1);
      expect(mgr.estimateTokenCount('abcde')).toBe(2);
      expect(mgr.estimateTokenCount('')).toBe(0);
    });
  });

  describe('estimateMessagesTokens', () => {
    it('sums all message tokens', () => {
      const mgr = new TokenBudgetManager(32_768);
      const messages = [
        { role: 'user', content: 'abcd' }, // 1 token
        { role: 'assistant', content: 'abcdef' }, // 2 tokens
      ];
      expect(mgr.estimateMessagesTokens(messages)).toBe(3);
    });
  });

  describe('evictIfNeeded', () => {
    it('returns messages unchanged when under budget', () => {
      const mgr = new TokenBudgetManager(32_768);
      const messages = [{ role: 'user', content: 'hello' }];
      const result = mgr.evictIfNeeded(messages);
      expect(result).toEqual(messages);
      expect(result).toBe(messages); // same reference
    });

    it('compacts messages when over budget', () => {
      const mgr = new TokenBudgetManager(1000, {
        tokenBudgetReservedForResponse: 100,
        tokenBudgetReservedForTools: 100,
      });
      // availableForContext = 800 tokens ≈ 3200 chars
      const messages = Array.from({ length: 8 }, () => ({
        role: 'user',
        content: 'a'.repeat(500), // 125 tokens each
      }));
      // 8 * 125 = 1000 tokens > 800 → need eviction
      const result = mgr.evictIfNeeded(messages);
      // Last 5 messages preserved, first 3 compacted
      expect(result.length).toBeLessThan(messages.length);
      expect(
        result.some((m) =>
          m.content.includes('Previous conversation compressed'),
        ),
      ).toBe(true);
    });

    it('keeps last 5 messages intact', () => {
      const mgr = new TokenBudgetManager(1000, {
        tokenBudgetReservedForResponse: 100,
        tokenBudgetReservedForTools: 100,
      });
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'x'.repeat(100),
      }));
      const result = mgr.evictIfNeeded(messages);
      // Last 5 should be preserved
      const preserved = result.slice(-5);
      expect(preserved.length).toBe(5);
      preserved.forEach((m) => {
        expect(m.content).not.toContain('Previous conversation compressed');
      });
    });
  });
});

describe('capToolResult', () => {
  it('returns unchanged when under limit', () => {
    const result = capToolResult('short', 100);
    expect(result).toBe('short');
  });

  it('truncates long results with head portion', () => {
    const long = 'a'.repeat(1000);
    const capped = capToolResult(long, 100);
    expect(capped.length).toBeLessThan(long.length);
    expect(capped).toContain('...');
    expect(capped).toContain('characters omitted');
  });
});
