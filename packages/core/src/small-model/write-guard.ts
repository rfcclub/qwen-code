/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

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
