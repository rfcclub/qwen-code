/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Error thrown when small-model quality failures exceed the escalation threshold.
 * Triggers model escalation fallback (gap-4).
 */
export class QualityEscalationError extends Error {
  constructor(
    message: string,
    readonly qualityIssues: Array<{
      severity: string;
      type: string;
      message: string;
    }>,
    readonly attemptCount: number,
  ) {
    super(`quality_failure: ${message}`);
    this.name = 'QualityEscalationError';
  }
}
