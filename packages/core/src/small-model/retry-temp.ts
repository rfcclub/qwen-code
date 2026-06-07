/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Adaptive retry temperature curve.
 *
 * Varies temperature per retry attempt:
 * - Attempt 0: 0.1 (deterministic)
 * - Attempt 1: 0.5 (balanced)
 * - Attempt 2: 0.9 (creative)
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
