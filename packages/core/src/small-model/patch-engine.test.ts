/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatchEngine } from './patch-engine.js';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('patch-engine re-export', () => {
  const engine = new PatchEngine();
  let tempFile: string;

  beforeEach(() => {
    tempFile = join(tmpdir(), `patch-engine-test-${Date.now()}.txt`);
    writeFileSync(tempFile, 'hello world\nfoo bar\n', 'utf-8');
  });

  afterEach(() => {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  });

  it('applies exact replace patches', () => {
    const result = engine.apply(tempFile, [
      { type: 'replace', search: 'foo bar', replace: 'FOO BAR' },
    ]);
    expect(result.success).toBe(true);
    expect(readFileSync(tempFile, 'utf-8')).toContain('FOO BAR');
  });
});
