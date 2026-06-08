/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  classifyErrorForEscalation,
  shouldEscalateOnError,
  type EscalationTrigger,
} from './escalationErrors.js';
import { QualityEscalationError } from '../small-model/escalation-error.js';

describe('classifyErrorForEscalation', () => {
  it('classifies 401 as auth_error', () => {
    const error = new Error('401 Unauthorized');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('auth_error');
  });

  it('classifies 403 as auth_error', () => {
    const error = new Error('403 Forbidden');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('auth_error');
  });

  it('classifies 404 as not_found', () => {
    const error = new Error('404 Not Found');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('not_found');
  });

  it('classifies 429 as rate_limit', () => {
    const error = new Error('429 Too Many Requests');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('rate_limit');
  });

  it('classifies 500 as server_error', () => {
    const error = new Error('500 Internal Server Error');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('server_error');
  });

  it('classifies context length exceeded as context_overflow', () => {
    const error = new Error('Context length exceeded');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('context_overflow');
  });

  it('classifies timeout as timeout', () => {
    const error = new Error('Connection timeout');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('timeout');
  });

  it('classifies QualityEscalationError as quality_failure', () => {
    const error = new QualityEscalationError('too many failures', [], 3);
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toContain('quality_failure');
  });

  it('returns empty array for unknown errors', () => {
    const error = new Error('Something went wrong');
    const triggers = classifyErrorForEscalation(error);
    expect(triggers).toEqual([]);
  });
});

describe('shouldEscalateOnError', () => {
  it('matches wildcard', () => {
    expect(
      shouldEscalateOnError(['auth_error'], ['*' as EscalationTrigger]),
    ).toBe(true);
  });

  it('matches specific trigger', () => {
    expect(shouldEscalateOnError(['auth_error'], ['auth_error'])).toBe(true);
  });

  it('does not match unrelated triggers', () => {
    expect(shouldEscalateOnError(['auth_error'], ['not_found'])).toBe(false);
  });

  it('returns false for empty configured triggers', () => {
    expect(shouldEscalateOnError(['auth_error'], [])).toBe(false);
  });
});
