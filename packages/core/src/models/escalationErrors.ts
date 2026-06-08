/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorStatus } from '../utils/errors.js';
import { QualityEscalationError } from '../small-model/escalation-error.js';

/** Triggers that can cause model escalation to the next fallback. */
export type EscalationTrigger =
  | 'auth_error'
  | 'not_found'
  | 'server_error'
  | 'rate_limit'
  | 'context_overflow'
  | 'max_tokens'
  | 'quality_failure'
  | 'timeout'
  | '*';

/**
 * Classify an error into escalation triggers.
 * Returns an empty array if the error is not escalation-worthy.
 */
export function classifyErrorForEscalation(
  error: unknown,
): EscalationTrigger[] {
  const triggers: EscalationTrigger[] = [];
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Also parse status codes from plain text messages (e.g. "401 Unauthorized")
  const statusFromMessage = message.match(/\b(\d{3})\b/);
  const parsedStatus =
    status ?? (statusFromMessage ? Number(statusFromMessage[1]) : undefined);

  // Auth errors (401, 403)
  if (parsedStatus === 401 || parsedStatus === 403) {
    triggers.push('auth_error');
  }

  // Model not found (404) or decommissioned
  if (parsedStatus === 404 || lowerMessage.includes('model not found')) {
    triggers.push('not_found');
  }

  // Server errors (5xx)
  if (parsedStatus !== undefined && parsedStatus >= 500 && parsedStatus < 600) {
    triggers.push('server_error');
  }

  // Rate limit (429 or message containing rate limit)
  if (parsedStatus === 429 || lowerMessage.includes('rate limit')) {
    triggers.push('rate_limit');
  }

  // Context overflow / context length exceeded
  if (
    lowerMessage.includes('context length exceeded') ||
    lowerMessage.includes('context_overflow') ||
    lowerMessage.includes('token limit exceeded') ||
    lowerMessage.includes('too many tokens')
  ) {
    triggers.push('context_overflow');
  }

  // Max tokens (finish reason MAX_TOKENS)
  if (
    lowerMessage.includes('max_tokens') ||
    lowerMessage.includes('max tokens')
  ) {
    triggers.push('max_tokens');
  }

  // Timeout
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('econnreset')
  ) {
    triggers.push('timeout');
  }

  // Quality failure from small-model middleware
  if (error instanceof QualityEscalationError) {
    triggers.push('quality_failure');
  }

  return triggers;
}

/**
 * Check if any of the error triggers match the configured escalation triggers.
 * Supports wildcard '*' to match all triggers.
 */
export function shouldEscalateOnError(
  errorTriggers: EscalationTrigger[],
  configuredTriggers?: EscalationTrigger[],
): boolean {
  if (!configuredTriggers || configuredTriggers.length === 0) {
    return false;
  }
  // Wildcard: escalate on any error
  if (configuredTriggers.includes('*' as EscalationTrigger)) {
    return errorTriggers.length > 0;
  }
  return errorTriggers.some((t) => configuredTriggers.includes(t));
}
