/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, existsSync } from 'node:fs';

/**
 * Context-Aware Read Guard — returns intelligent content
 * within token budget rather than whole files.
 *
 * Uses head + tail strategy: shows the beginning and end of
 * large files with a summary of omitted content in between.
 */
export class ReadGuard {
  /**
   * Read a file with intelligent truncation within a token budget.
   */
  readFile(filePath: string, budgetChars: number): string {
    if (!existsSync(filePath)) return `File not found: ${filePath}`;
    const content = readFileSync(filePath, 'utf-8');
    if (content.length <= budgetChars) return content;

    const headLen = Math.floor(budgetChars * 0.4);
    const tailLen = Math.floor(budgetChars * 0.4);
    const omitted = content.length - headLen - tailLen;

    return (
      content.slice(0, headLen) +
      `\n\n[... ${omitted.toLocaleString()} characters omitted for token budget ...]\n\n` +
      content.slice(-tailLen)
    );
  }
}

/**
 * Read-Before-Write Guard — prevents writing to files the model
 * hasn't read in the current session.
 */
export class ReadBeforeWriteGuard {
  private readFiles = new Set<string>();
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * Mark a file as read.
   */
  markRead(path: string): void {
    this.readFiles.add(path);
  }

  /**
   * Check if a file can be written to.
   */
  canWrite(path: string): { allowed: boolean; reason?: string } {
    if (!this.enabled) return { allowed: true };
    if (this.readFiles.has(path)) return { allowed: true };
    return {
      allowed: false,
      reason: `Cannot edit ${path} without reading it first. Read the file to see its current content.`,
    };
  }
}
