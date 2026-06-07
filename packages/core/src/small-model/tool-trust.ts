/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolTrustEntry } from './types.js';

/**
 * Tool Trust Manager — tracks reliability per tool and disables
 * tools that fail repeatedly.
 *
 * Threshold: disable after 3 consecutive failures.
 * Re-enable after a successful call.
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
