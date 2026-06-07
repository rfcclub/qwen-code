/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SmallModelMiddleware } from './index.js';
import { QualityEscalationError } from './escalation-error.js';

describe('SmallModelMiddleware quality escalation', () => {
  it('throws QualityEscalationError after 3 quality failures', () => {
    const mw = new SmallModelMiddleware(32_768, []);

    // 3 failed attempts with empty turns
    for (let i = 0; i < 3; i++) {
      mw.postResponse('', []);
    }

    expect(() => mw.postResponse('', [])).toThrow(QualityEscalationError);
  });

  it('does not throw before threshold', () => {
    const mw = new SmallModelMiddleware(32_768, []);

    // 3 failed attempts (threshold is 3, so 4th should throw)
    mw.postResponse('', []);
    mw.postResponse('', []);
    mw.postResponse('', []);

    expect(() => mw.postResponse('', [])).toThrow(QualityEscalationError);
  });

  it('resets attempt count on successful turn', () => {
    const mw = new SmallModelMiddleware(32_768, []);

    // 2 failures
    mw.postResponse('', []);
    mw.postResponse('', []);

    // Reset
    mw.resetRetries();

    // 3 failures after reset (threshold is 3, so 4th should throw)
    mw.postResponse('', []);
    mw.postResponse('', []);
    mw.postResponse('', []);
    expect(() => mw.postResponse('', [])).toThrow(QualityEscalationError);
  });

  it('escalation error includes quality issues', () => {
    const mw = new SmallModelMiddleware(32_768, []);

    for (let i = 0; i < 3; i++) {
      mw.postResponse('', []);
    }

    try {
      mw.postResponse('', []);
    } catch (error) {
      expect(error).toBeInstanceOf(QualityEscalationError);
      const qe = error as QualityEscalationError;
      expect(qe.qualityIssues.length).toBeGreaterThan(0);
      expect(qe.attemptCount).toBe(3);
    }
  });
});
