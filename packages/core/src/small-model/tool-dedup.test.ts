/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ToolDeduplicator } from './tool-dedup.js';

describe('tool-dedup re-export', () => {
  it('caches read-only tool calls', () => {
    const dedup = new ToolDeduplicator();
    const params = { path: '/tmp/file.txt' };
    const result = { content: 'hello' };

    dedup.recordResult('read_file', params, result);
    const check = dedup.shouldExecute('read_file', params);

    expect(check.execute).toBe(false);
    expect(check.cached).toEqual(result);
  });

  it('does not cache write tools', () => {
    const dedup = new ToolDeduplicator();
    dedup.recordResult('write_file', { path: '/a' }, { ok: true });
    const check = dedup.shouldExecute('write_file', { path: '/a' });
    expect(check.execute).toBe(true);
  });
});
