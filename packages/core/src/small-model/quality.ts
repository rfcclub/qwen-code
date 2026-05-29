/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { QualityIssue, ToolTrustEntry } from './types.js';

/**
 * Quality Monitor — detects and flags quality issues in model outputs.
 */
export class QualityMonitor {
  private availableTools: Set<string>;
  private recentCalls: Array<{ tool: string; params: string }> = [];
  private repeatDetectionWindow = 5;

  constructor(availableTools: string[]) {
    this.availableTools = new Set(availableTools);
  }

  /**
   * Check a model turn for quality issues.
   */
  checkTurn(
    text: string,
    toolCalls: Array<{ name: string; params: unknown }>,
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // 1. Empty turn detection
    if (toolCalls.length === 0 && (!text || text.trim().length < 10)) {
      issues.push({
        severity: 'error',
        type: 'empty_turn',
        message:
          'Model produced empty turn with no tool calls or meaningful text.',
      });
    }

    // 2. Hallucinated tool names
    for (const call of toolCalls) {
      if (!this.availableTools.has(call.name)) {
        issues.push({
          severity: 'warning',
          type: 'hallucinated_tool',
          message: `Model called unknown tool "${call.name}". Available: ${[...this.availableTools].join(', ')}`,
          toolName: call.name,
        });
      }
    }

    // 3. Exact-repeat calls (same tool + same params within window)
    for (const call of toolCalls) {
      const paramsStr = JSON.stringify(call.params);
      const duplicate = this.recentCalls.find(
        (rc) => rc.tool === call.name && rc.params === paramsStr,
      );
      if (duplicate) {
        issues.push({
          severity: 'warning',
          type: 'repeat_call',
          message: `Duplicate tool call: ${call.name} with identical params.`,
          toolName: call.name,
        });
      }

      // Track for future detection
      this.recentCalls.push({ tool: call.name, params: paramsStr });
    }

    // Trim the window
    if (this.recentCalls.length > this.repeatDetectionWindow * 2) {
      this.recentCalls = this.recentCalls.slice(-this.repeatDetectionWindow);
    }

    return issues;
  }

  /**
   * Check if a tool name is valid.
   */
  isValidTool(name: string): boolean {
    return this.availableTools.has(name);
  }
}

/**
 * Tool Trust Manager — tracks reliability per tool and disables
 * tools that fail repeatedly.
 */
export class ToolTrustManager {
  private entries: Map<string, ToolTrustEntry> = new Map();
  private consecutiveFailThreshold = 3;

  /**
   * Get available tools (excluding disabled).
   */
  getAvailableTools(): string[] {
    return [...this.entries.values()]
      .filter((e) => !e.disabled)
      .map((e) => e.name);
  }

  /**
   * Record a tool execution result.
   */
  recordResult(name: string, success: boolean): void {
    const entry = this.entries.get(name) ?? {
      name,
      successCount: 0,
      failCount: 0,
      disabled: false,
    };

    if (success) {
      entry.successCount++;
      entry.failCount = 0;
      // Re-enable if it was disabled and now succeeding
      if (entry.disabled) {
        entry.disabled = false;
      }
    } else {
      entry.failCount++;
      entry.lastFailure = new Date().toISOString();
      if (entry.failCount >= this.consecutiveFailThreshold) {
        entry.disabled = true;
      }
    }

    this.entries.set(name, entry);
  }

  /**
   * Try to re-enable tools on non-failing turns.
   */
  tryAutoEnable(): string[] {
    const reEnabled: string[] = [];
    for (const entry of this.entries.values()) {
      if (entry.disabled && entry.failCount < this.consecutiveFailThreshold) {
        entry.disabled = false;
        reEnabled.push(entry.name);
      }
    }
    return reEnabled;
  }
}

/**
 * Adaptive retry temperature curve.
 */
export class RetryTemperature {
  private start: number;
  private step: number;

  constructor(start = 0.1, step = 0.4) {
    this.start = start;
    this.step = step;
  }

  /**
   * Get temperature for a given attempt number.
   */
  getTemperature(attempt: number): number {
    return Math.min(this.start + attempt * this.step, 1.0);
  }
}
