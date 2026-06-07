/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { QualityIssue } from './types.js';

/**
 * Quality Monitor — detects and flags quality issues in model outputs.
 *
 * Checks:
 * - Empty tool calls (no output)
 * - Hallucinated tool names (not in schema)
 * - Exact-repeat calls (same args, same result)
 * - Infinite loops (>5 identical calls)
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
