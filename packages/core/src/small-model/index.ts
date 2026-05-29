/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SmallModelConfig } from './types.js';
import { DEFAULT_SMALL_MODEL_CONFIG } from './types.js';
import { TokenBudgetManager } from './budget.js';
import { ForgivingToolParser } from './parser.js';
import { TodoPlanner } from './plan.js';
import {
  QualityMonitor,
  ToolTrustManager,
  RetryTemperature,
} from './quality.js';
import { ToolDeduplicator } from './dedup.js';
import { ReadGuard, ReadBeforeWriteGuard } from './read-guard.js';
import { PatchEngine } from './patch.js';

export type { SmallModelConfig } from './types.js';
export { DEFAULT_SMALL_MODEL_CONFIG } from './types.js';
export { TokenBudgetManager } from './budget.js';
export { ForgivingToolParser } from './parser.js';
export { TodoPlanner } from './plan.js';
export {
  QualityMonitor,
  ToolTrustManager,
  RetryTemperature,
} from './quality.js';
export { ToolDeduplicator } from './dedup.js';
export { ReadGuard, ReadBeforeWriteGuard } from './read-guard.js';
export { PatchEngine } from './patch.js';

/**
 * Pre-LLM request context injected by the middleware.
 */
export interface PreRequestContext {
  /** Messages being sent to the LLM (may be modified in-place) */
  messages: Array<{ role: string; content: string }>;
  /** If set, override the temperature for this request */
  temperatureOverride?: number;
}

/**
 * Post-LLM response context processed by the middleware.
 */
export interface PostResponseContext {
  /** Raw text from the model */
  text: string;
  /** Parsed tool calls (possibly repaired from malformed output) */
  toolCalls: Array<{ name: string; params: Record<string, unknown> }>;
  /** Quality issues detected */
  qualityIssues: Array<{
    severity: string;
    type: string;
    message: string;
  }>;
  /** Whether to retry this turn */
  shouldRetry: boolean;
  /** Reason for retry */
  retryReason?: string;
}

/**
 * Model info required for auto-detection.
 */
export interface ModelInfo {
  contextWindow?: number;
  parameters?: number; // e.g. 7_000_000_000 for 7B
  name: string;
}

/**
 * Middleware pipeline for the Small-Model Optimization Layer.
 *
 * Wraps LLM requests and responses with compensating infrastructure
 * that makes smaller models (7B-35B) more reliable for coding tasks.
 */
export class SmallModelMiddleware {
  readonly config: SmallModelConfig;
  readonly budget: TokenBudgetManager;
  readonly parser: ForgivingToolParser;
  readonly plan: TodoPlanner;
  readonly quality: QualityMonitor;
  readonly trust: ToolTrustManager;
  readonly retryTemp: RetryTemperature;
  readonly dedup: ToolDeduplicator;
  readonly readGuard: ReadGuard;
  readonly readBeforeWrite: ReadBeforeWriteGuard;
  readonly patch: PatchEngine;

  private attemptCount = 0;

  constructor(
    modelMaxTokens: number,
    availableTools: string[],
    config?: Partial<SmallModelConfig>,
  ) {
    this.config = { ...DEFAULT_SMALL_MODEL_CONFIG, ...config };
    this.budget = new TokenBudgetManager(modelMaxTokens, this.config);
    this.parser = new ForgivingToolParser();
    this.plan = new TodoPlanner();
    this.quality = new QualityMonitor(availableTools);
    this.trust = new ToolTrustManager();
    this.retryTemp = new RetryTemperature(
      this.config.retryTemperatureStart,
      this.config.retryTemperatureStep,
    );
    this.dedup = new ToolDeduplicator(this.config.dedupWindowSize);
    this.readGuard = new ReadGuard();
    this.readBeforeWrite = new ReadBeforeWriteGuard(
      this.config.readBeforeWriteGuard,
    );
    this.patch = new PatchEngine();
  }

  /**
   * Pre-request pipeline: inject TODOs, enforce token budget,
   * cap tool results, adjust temperature.
   */
  preRequest(ctx: PreRequestContext): PreRequestContext {
    // 1. Inject TODO plan (if enabled)
    if (this.config.enableTodoPlanning) {
      const todoContext = this.plan.getTodoContext();
      if (todoContext) {
        // Inject as a system-role message or append to last user message
        const lastMsg = ctx.messages[ctx.messages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          lastMsg.content += '\n\n' + todoContext;
        }
      }
    }

    // 2. Enforce token budget (evict if needed)
    ctx.messages = this.budget.evictIfNeeded(ctx.messages);

    // 3. Set temperature based on retry
    ctx.temperatureOverride = this.retryTemp.getTemperature(this.attemptCount);

    return ctx;
  }

  /**
   * Post-response pipeline: parse tool calls, quality check,
   * deduplicate, track trust.
   */
  postResponse(
    text: string,
    rawToolCalls: Array<{ name: string; params: unknown }>,
  ): PostResponseContext {
    const ctx: PostResponseContext = {
      text,
      toolCalls: [],
      qualityIssues: [],
      shouldRetry: false,
    };

    // 1. Parse tool calls (forgiving)
    if (rawToolCalls.length === 0 && text.trim().length > 0) {
      // Model may have output tool calls in non-JSON format
      const parsed = this.parser.parse(text);
      ctx.toolCalls = parsed.map((c) => ({
        name: c.name,
        params: c.params as Record<string, unknown>,
      }));
    } else {
      ctx.toolCalls = rawToolCalls.map((c) => ({
        name: c.name,
        params: c.params as Record<string, unknown>,
      }));
    }

    // 2. Quality check
    if (this.config.qualityMonitorEnabled) {
      ctx.qualityIssues = this.quality.checkTurn(text, ctx.toolCalls);

      const hasError = ctx.qualityIssues.some((i) => i.severity === 'error');
      if (hasError) {
        ctx.shouldRetry = true;
        ctx.retryReason = ctx.qualityIssues
          .filter((i) => i.severity === 'error')
          .map((i) => i.message)
          .join('; ');
      }
    }

    // 3. Track attempt count
    this.attemptCount++;

    return ctx;
  }

  /**
   * Record a tool execution result for trust scoring.
   */
  recordToolResult(name: string, success: boolean): void {
    this.trust.recordResult(name, success);
    if (success) {
      this.dedup.recordResult(name, {}, {});
    }
  }

  /**
   * Get available tools filtered by trust.
   */
  getAvailableTools(): string[] {
    return this.trust.getAvailableTools();
  }

  /**
   * Check if a file can be written.
   */
  canWriteFile(path: string): { allowed: boolean; reason?: string } {
    return this.readBeforeWrite.canWrite(path);
  }

  /**
   * Mark a file as read.
   */
  markFileRead(path: string): void {
    this.readBeforeWrite.markRead(path);
  }

  /**
   * Create a TODO plan from a task description.
   */
  createPlan(taskDescription: string): void {
    this.plan.createPlan(taskDescription);
  }

  /**
   * Reset retry count (call on successful turn).
   */
  resetRetries(): void {
    this.attemptCount = 0;
  }
}

/**
 * Detect whether small-model optimization should be auto-enabled.
 */
export function shouldEnableSmallModelOptimization(
  model: ModelInfo,
  userConfig?: { smallModelOptimization?: boolean },
): boolean {
  // User override
  if (userConfig?.smallModelOptimization !== undefined) {
    return userConfig.smallModelOptimization;
  }

  if (model.contextWindow !== undefined && model.contextWindow < 32_768)
    return true;
  if (model.parameters !== undefined && model.parameters < 35_000_000_000)
    return true;
  return false;
}
