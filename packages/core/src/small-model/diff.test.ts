/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiffPreview } from './diff.js';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('DiffPreview', () => {
  let tempFile: string;
  const diff = new DiffPreview();

  beforeEach(() => {
    tempFile = join(tmpdir(), `diff-test-${Date.now()}.txt`);
    writeFileSync(tempFile, 'hello world\nfoo bar\nbaz qux\n', 'utf-8');
  });

  afterEach(() => {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  });

  it('generates diff preview for exact replace', () => {
    const preview = diff.preview(tempFile, 'foo bar', 'FOO BAR');
    expect(preview).toContain('-foo bar');
    expect(preview).toContain('+FOO BAR');
  });

  it('returns empty for no match', () => {
    const preview = diff.preview(tempFile, 'not found', 'xxx');
    expect(preview).toContain('No match found');
  });

  it('counts lines changed', () => {
    const preview = diff.preview(tempFile, 'foo bar', 'FOO BAR');
    const stats = diff.stats(preview);
    expect(stats.removals).toBe(1);
    expect(stats.additions).toBe(1);
  });
});
