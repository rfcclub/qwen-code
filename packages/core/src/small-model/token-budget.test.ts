/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { TokenBudgetManager, capToolResult } from './token-budget.js';

describe('token-budget re-export', () => {
  it('exports TokenBudgetManager', () => {
    const mgr = new TokenBudgetManager(32_768);
    expect(mgr.getBudget().maxTokens).toBe(32_768);
  });

  it('exports capToolResult', () => {
    const capped = capToolResult('a'.repeat(1000), 100);
    expect(capped).toContain('...');
  });
});
