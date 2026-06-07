/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ToolTrustManager } from './tool-trust.js';

describe('ToolTrustManager', () => {
  it('returns empty available tools initially', () => {
    const trust = new ToolTrustManager();
    expect(trust.getAvailableTools()).toEqual([]);
  });

  it('tracks successful tool calls', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('read_file', true);
    expect(trust.getAvailableTools()).toContain('read_file');
  });

  it('disables tool after 3 consecutive failures', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    expect(trust.getAvailableTools()).not.toContain('edit');
  });

  it('re-enables tool after success', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', true);
    expect(trust.getAvailableTools()).toContain('edit');
  });

  it('tryAutoEnable does not re-enable when failCount >= threshold', () => {
    const trust = new ToolTrustManager();
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    trust.recordResult('edit', false);
    expect(trust.getAvailableTools()).not.toContain('edit');

    const reEnabled = trust.tryAutoEnable();
    expect(reEnabled).toEqual([]);
    expect(trust.getAvailableTools()).not.toContain('edit');
  });
});
