/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { EscalationManager } from './escalationManager.js';
import { QualityEscalationError } from '../small-model/escalation-error.js';
import type { Config } from '../config/config.js';

function createMockConfig(
  providers: Record<string, unknown> = {},
  model = 'qwen-7b',
): Config {
  return {
    getModel: () => model,
    getAuthType: () => 'qwen_oauth',
    getModelsConfig: () =>
      ({
        getModelProvidersConfig: () => providers,
      }) as unknown as ReturnType<Config['getModelsConfig']>,
    setModel: vi.fn(),
  } as unknown as Config;
}

describe('EscalationManager', () => {
  it('has no chain when config is empty', () => {
    const config = createMockConfig();
    const mgr = new EscalationManager(config);
    expect(mgr.hasChain()).toBe(false);
  });

  it('has chain when escalationChain is configured', () => {
    const config = createMockConfig({
      escalationChain: [{ model: 'qwen-coder', onErrors: ['auth_error'] }],
    });
    const mgr = new EscalationManager(config);
    expect(mgr.hasChain()).toBe(true);
  });

  it('shouldEscalate on auth_error when configured', () => {
    const config = createMockConfig({
      escalationChain: [{ model: 'qwen-coder', onErrors: ['auth_error'] }],
    });
    const mgr = new EscalationManager(config);
    const error = new Error('401 Unauthorized');
    expect(mgr.shouldEscalate(error)).toBe(true);
  });

  it('should not escalate on unmatched error', () => {
    const config = createMockConfig({
      escalationChain: [{ model: 'qwen-coder', onErrors: ['not_found'] }],
    });
    const mgr = new EscalationManager(config);
    const error = new Error('401 Unauthorized');
    expect(mgr.shouldEscalate(error)).toBe(false);
  });

  it('escalates on QualityEscalationError when quality_failure is configured', () => {
    const config = createMockConfig({
      escalationChain: [{ model: 'qwen-coder', onErrors: ['quality_failure'] }],
    });
    const mgr = new EscalationManager(config);
    const error = new QualityEscalationError('too many empty turns', [], 3);
    expect(mgr.shouldEscalate(error)).toBe(true);
  });

  it('escalates to next model in chain', async () => {
    const config = createMockConfig({
      escalationChain: [
        { model: 'qwen-coder', onErrors: ['auth_error'] },
        { model: 'claude-sonnet', onErrors: ['*'] },
      ],
    });
    const mgr = new EscalationManager(config);
    const result = await mgr.escalate();
    expect(result).toBe(true);
    expect(config.setModel).toHaveBeenCalledWith('qwen-coder', {
      reason: 'escalation_fallback',
      context: 'step 1 of escalation chain',
    });
  });

  it('returns false when chain is exhausted', async () => {
    const config = createMockConfig({
      escalationChain: [{ model: 'qwen-coder', onErrors: ['auth_error'] }],
    });
    const mgr = new EscalationManager(config);
    await mgr.escalate(); // step 1
    const result = await mgr.escalate(); // exhausted
    expect(result).toBe(false);
  });

  it('restores original model after escalation', async () => {
    const config = createMockConfig(
      {
        escalationChain: [{ model: 'qwen-coder', onErrors: ['auth_error'] }],
      },
      'qwen-7b',
    );
    const mgr = new EscalationManager(config);
    await mgr.escalate();
    expect(mgr.getCurrentStep()).toBe(1);
    await mgr.restoreOriginalModel();
    expect(config.setModel).toHaveBeenLastCalledWith('qwen-7b', {
      reason: 'escalation_restore',
      context: 'restoring original model after escalation',
    });
    expect(mgr.getCurrentStep()).toBe(0);
  });

  it('respects maxSteps limit', async () => {
    const config = createMockConfig({
      escalationChain: [
        { model: 'qwen-coder', onErrors: ['auth_error'] },
        { model: 'claude-sonnet', onErrors: ['auth_error'] },
        { model: 'gpt-4', onErrors: ['auth_error'] },
      ],
      escalationMaxSteps: 2,
    });
    const mgr = new EscalationManager(config);
    await mgr.escalate(); // step 1: qwen-coder
    await mgr.escalate(); // step 2: claude-sonnet
    const next = mgr.getNextStep();
    expect(next).toBeUndefined();
  });
});
