/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatchEngine } from './patch.js';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PatchEngine', () => {
  const engine = new PatchEngine();
  let tempFile: string;

  beforeEach(() => {
    tempFile = join(tmpdir(), `patch-test-${Date.now()}.txt`);
    writeFileSync(tempFile, 'hello world\nfoo bar\nbaz qux\n', 'utf-8');
  });

  afterEach(() => {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  });

  describe('exact replace', () => {
    it('replaces matched text', () => {
      const result = engine.apply(tempFile, [
        { type: 'replace', search: 'foo bar', replace: 'FOO BAR' },
      ]);
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(1);
      expect(result.confidence).toBe(1.0);
      const content = readFileSync(tempFile, 'utf-8');
      expect(content).toBe('hello world\nFOO BAR\nbaz qux\n');
    });

    it('fails when search text not found', () => {
      const result = engine.apply(tempFile, [
        { type: 'replace', search: 'not found', replace: 'xxx' },
      ]);
      expect(result.success).toBe(false);
      expect(result.patchCount).toBe(0);
    });
  });

  describe('fuzzy replace', () => {
    it('matches with whitespace normalization', () => {
      const result = engine.apply(tempFile, [
        { type: 'replace', search: 'foo  bar', replace: 'FUZZY', fuzzy: true },
      ]);
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(1);
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('line-range replace', () => {
    it('matches inside specified line range', () => {
      const result = engine.apply(tempFile, [
        {
          type: 'replace',
          search: 'foo bar',
          replace: 'LINE_RANGE',
          lineRange: { start: 1, end: 2 },
        },
      ]);
      expect(result.success).toBe(true);
      // exact match may hit first (confidence 1.0) depending on implementation order
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('insert', () => {
    it('inserts after search text', () => {
      const result = engine.apply(tempFile, [
        { type: 'insert', search: 'hello world', replace: '\nINSERTED' },
      ]);
      expect(result.success).toBe(true);
      const content = readFileSync(tempFile, 'utf-8');
      expect(content).toContain('hello world\nINSERTED');
    });

    it('appends when search not found', () => {
      const result = engine.apply(tempFile, [
        { type: 'insert', search: 'not found', replace: 'APPENDED' },
      ]);
      expect(result.success).toBe(true);
      const content = readFileSync(tempFile, 'utf-8');
      expect(content.endsWith('APPENDED')).toBe(true);
    });
  });

  describe('delete', () => {
    it('removes matched text', () => {
      const result = engine.apply(tempFile, [
        { type: 'delete', search: 'foo bar\n' },
      ]);
      expect(result.success).toBe(true);
      const content = readFileSync(tempFile, 'utf-8');
      expect(content).not.toContain('foo bar');
    });
  });

  describe('multi-line patch', () => {
    it('applies multiple patches in order', () => {
      const result = engine.apply(tempFile, [
        { type: 'replace', search: 'foo bar', replace: 'FOO BAR' },
        { type: 'replace', search: 'baz qux', replace: 'BAZ QUX' },
      ]);
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(2);
      const content = readFileSync(tempFile, 'utf-8');
      expect(content).toBe('hello world\nFOO BAR\nBAZ QUX\n');
    });
  });

  describe('error handling', () => {
    it('returns error for missing file', () => {
      const result = engine.apply('/nonexistent/path', [
        { type: 'replace', search: 'a', replace: 'b' },
      ]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read file');
    });
  });
});
