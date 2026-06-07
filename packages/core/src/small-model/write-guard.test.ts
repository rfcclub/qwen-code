/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ReadBeforeWriteGuard } from './write-guard.js';

describe('ReadBeforeWriteGuard', () => {
  it('blocks write for unread files', () => {
    const guard = new ReadBeforeWriteGuard();
    const result = guard.canWrite('/tmp/new.txt');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot edit');
  });

  it('allows write for read files', () => {
    const guard = new ReadBeforeWriteGuard();
    guard.markRead('/tmp/new.txt');
    const result = guard.canWrite('/tmp/new.txt');
    expect(result.allowed).toBe(true);
  });

  it('allows all writes when disabled', () => {
    const guard = new ReadBeforeWriteGuard(false);
    const result = guard.canWrite('/tmp/new.txt');
    expect(result.allowed).toBe(true);
  });
});
