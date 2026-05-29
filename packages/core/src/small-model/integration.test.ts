/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  SmallModelMiddleware,
  shouldEnableSmallModelOptimization,
  type ModelInfo,
} from './index.js';

describe('shouldEnableSmallModelOptimization', () => {
  it('returns true for models with context window < 32K', () => {
    const model: ModelInfo = {
      name: 'qwen-7b',
      contextWindow: 16_384,
      parameters: 7_000_000_000,
    };
    expect(shouldEnableSmallModelOptimization(model)).toBe(true);
  });

  it('returns true for models with parameters < 35B', () => {
    const model: ModelInfo = {
      name: 'qwen-14b',
      contextWindow: 64_000,
      parameters: 14_000_000_000,
    };
    expect(shouldEnableSmallModelOptimization(model)).toBe(true);
  });

  it('returns false for frontier models', () => {
    const model: ModelInfo = {
      name: 'qwen-max',
      contextWindow: 131_072,
      parameters: 72_000_000_000,
    };
    expect(shouldEnableSmallModelOptimization(model)).toBe(false);
  });

  it('respects user override true', () => {
    const model: ModelInfo = { name: 'qwen-max', contextWindow: 131_072 };
    expect(
      shouldEnableSmallModelOptimization(model, {
        smallModelOptimization: true,
      }),
    ).toBe(true);
  });

  it('respects user override false', () => {
    const model: ModelInfo = { name: 'qwen-7b', contextWindow: 16_384 };
    expect(
      shouldEnableSmallModelOptimization(model, {
        smallModelOptimization: false,
      }),
    ).toBe(false);
  });

  it('returns false when no contextWindow or parameters given', () => {
    const model: ModelInfo = { name: 'unknown' };
    expect(shouldEnableSmallModelOptimization(model)).toBe(false);
  });
});

describe('SmallModelMiddleware integration', () => {
  const tools = ['read_file', 'write_file', 'grep_search', 'edit'];

  it('initializes all components', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    expect(mw.config.enabled).toBe(true);
    expect(mw.config.tokenBudgetReservedForResponse).toBe(4096);
    expect(mw.budget).toBeDefined();
    expect(mw.parser).toBeDefined();
    expect(mw.plan).toBeDefined();
    expect(mw.quality).toBeDefined();
    expect(mw.trust).toBeDefined();
    expect(mw.dedup).toBeDefined();
    expect(mw.readGuard).toBeDefined();
    expect(mw.patch).toBeDefined();
  });

  it('preRequest injects TODO context when enabled', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    mw.createPlan('Implement feature X\n1. Read config\n2. Edit code');

    const ctx = mw.preRequest({
      messages: [{ role: 'user', content: 'Do it' }],
    });
    expect(ctx.messages[0]!.content).toContain('📋 **Plan**');
  });

  it('preRequest does not inject TODO when empty', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const ctx = mw.preRequest({
      messages: [{ role: 'user', content: 'Do it' }],
    });
    expect(ctx.messages[0]!.content).not.toContain('📋 **Plan**');
  });

  it('preRequest sets temperature override', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const ctx = mw.preRequest({ messages: [] });
    expect(ctx.temperatureOverride).toBe(0.1);
  });

  it('preRequest evicts messages when over budget', () => {
    const mw = new SmallModelMiddleware(1000, tools, {
      tokenBudgetReservedForResponse: 100,
      tokenBudgetReservedForTools: 100,
    });
    const messages = Array.from({ length: 8 }, () => ({
      role: 'user' as const,
      content: 'a'.repeat(500),
    }));
    const ctx = mw.preRequest({ messages });
    expect(ctx.messages.length).toBeLessThan(messages.length);
  });

  it('postResponse parses plain text tool calls', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const ctx = mw.postResponse('search for "foo"', []);
    expect(ctx.toolCalls.length).toBeGreaterThan(0);
    expect(ctx.toolCalls[0]!.name).toBe('grep_search');
  });

  it('postResponse flags empty turns', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const ctx = mw.postResponse('', []);
    expect(ctx.qualityIssues.length).toBeGreaterThan(0);
    expect(ctx.qualityIssues[0]!.type).toBe('empty_turn');
    expect(ctx.shouldRetry).toBe(true);
  });

  it('postResponse does not flag valid turns', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const ctx = mw.postResponse('Here is my analysis.', []);
    expect(ctx.qualityIssues.length).toBe(0);
    expect(ctx.shouldRetry).toBe(false);
  });

  it('tracks tool trust', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    mw.recordToolResult('read_file', true);
    expect(mw.getAvailableTools()).toContain('read_file');
  });

  it('read-before-write guard blocks unread files', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    const result = mw.canWriteFile('/tmp/new.txt');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot edit');
  });

  it('read-before-write guard allows read files', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    mw.markFileRead('/tmp/new.txt');
    const result = mw.canWriteFile('/tmp/new.txt');
    expect(result.allowed).toBe(true);
  });

  it('resetRetries resets temperature to start', () => {
    const mw = new SmallModelMiddleware(32_768, tools);
    // Simulate retries
    mw.postResponse('', []);
    mw.postResponse('', []);
    mw.resetRetries();
    const ctx = mw.preRequest({ messages: [] });
    expect(ctx.temperatureOverride).toBe(0.1);
  });
});
