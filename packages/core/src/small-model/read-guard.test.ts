/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadGuard } from './read-guard.js';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ReadGuard', () => {
  const guard = new ReadGuard();
  let tempFile: string;

  beforeEach(() => {
    tempFile = join(tmpdir(), `read-guard-test-${Date.now()}.txt`);
  });

  afterEach(() => {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  });

  it('returns full content when under budget', () => {
    const content = 'short content';
    writeFileSync(tempFile, content, 'utf-8');
    const result = guard.readFile(tempFile, 1000);
    expect(result).toBe(content);
  });

  it('returns truncated content with head and tail when over budget', () => {
    const content = 'a'.repeat(2000);
    writeFileSync(tempFile, content, 'utf-8');
    const result = guard.readFile(tempFile, 500);
    expect(result).toContain('...');
    expect(result).toContain('characters omitted');
    expect(result.startsWith('a'.repeat(200))).toBe(true);
    expect(result.endsWith('a'.repeat(200))).toBe(true);
  });

  it('preserves section markers in omitted region', () => {
    const content = [
      'a'.repeat(200),
      '# Section: Initialization',
      'b'.repeat(200),
      '# Section: Cleanup',
      'c'.repeat(200),
    ].join('\n');
    writeFileSync(tempFile, content, 'utf-8');
    const result = guard.readFile(tempFile, 300);
    expect(result).toContain('Sections in omitted region');
    expect(result).toContain('Initialization');
    expect(result).toContain('Cleanup');
  });

  it('returns file not found for missing paths', () => {
    const result = guard.readFile('/nonexistent/path', 100);
    expect(result).toContain('File not found');
  });
});
