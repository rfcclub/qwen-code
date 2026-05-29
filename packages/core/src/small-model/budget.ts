/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SmallModelConfig, TokenBudget } from './types.js';

/**
 * Manages token budgets to prevent context window overflow.
 *
 * Tracks available context space, enforces limits, and evicts
 * non-essential messages with semantic compression when approaching
 * the model's context window limit.
 */
export class TokenBudgetManager {
  private modelMaxTokens: number;
  private config: Pick<
    SmallModelConfig,
    'tokenBudgetReservedForResponse' | 'tokenBudgetReservedForTools'
  >;

  constructor(
    modelMaxTokens: number,
    config?: Pick<
      SmallModelConfig,
      'tokenBudgetReservedForResponse' | 'tokenBudgetReservedForTools'
    >,
  ) {
    this.modelMaxTokens = modelMaxTokens;
    this.config = config ?? {
      tokenBudgetReservedForResponse: 4096,
      tokenBudgetReservedForTools: 4096,
    };
  }

  /**
   * Compute the current budget allocation for a model.
   */
  getBudget(): TokenBudget {
    const reservedForResponse = this.config.tokenBudgetReservedForResponse;
    const reservedForTools = this.config.tokenBudgetReservedForTools;
    return {
      maxTokens: this.modelMaxTokens,
      reservedForResponse,
      reservedForTools,
      availableForContext:
        this.modelMaxTokens - reservedForResponse - reservedForTools,
    };
  }

  /**
   * Rough token estimation (1 token ≈ 4 chars for most code/text).
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for a list of messages.
   */
  estimateMessagesTokens(
    messages: Array<{ role: string; content: string }>,
  ): number {
    return messages.reduce(
      (sum, m) => sum + this.estimateTokenCount(m.content),
      0,
    );
  }

  /**
   * Evict messages if they exceed the available context budget.
   * Keeps the last 5 turns intact and compresses older ones.
   */
  evictIfNeeded(
    messages: Array<{ role: string; content: string }>,
  ): Array<{ role: string; content: string }> {
    const budget = this.getBudget();
    const currentTokens = this.estimateMessagesTokens(messages);
    if (currentTokens <= budget.availableForContext) {
      return messages;
    }

    const excess = currentTokens - budget.availableForContext;
    return this.compactMessages(messages, excess);
  }

  private compactMessages(
    messages: Array<{ role: string; content: string }>,
    _excess: number,
  ): Array<{ role: string; content: string }> {
    // Keep last 5 turns intact (or all if fewer)
    const keepCount = Math.min(5, messages.length);
    const keepFrom = Math.max(0, messages.length - keepCount);

    const toCompact = messages.slice(0, keepFrom);
    const preserved = messages.slice(keepFrom);

    // Compact: summarize each message into 1 line
    const compressed = toCompact
      .map((m) => {
        const preview = m.content.replace(/\n/g, ' ').slice(0, 80);
        return `[History: ${m.role}] ${preview}...`;
      })
      .join('\n');

    const summary = compressed
      ? [
          {
            role: 'system' as const,
            content: `[Previous conversation compressed: ${compressed.length > 200 ? compressed.slice(0, 200) + '...' : compressed}]`,
          },
        ]
      : [];

    return [...summary, ...preserved];
  }
}

/**
 * Cap tool result content to prevent blowup.
 */
export function capToolResult(result: string, maxChars: number): string {
  if (result.length <= maxChars) return result;
  const headLen = Math.floor(maxChars * 0.6);
  const skipped = result.length - headLen;
  return (
    result.slice(0, headLen) +
    `\n\n[... ${skipped.toLocaleString()} characters omitted for token budget ...]\n`
  );
}
