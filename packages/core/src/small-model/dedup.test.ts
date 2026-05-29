/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ToolDeduplicator } from './dedup.js';

describe('ToolDeduplicator', () => {
  describe('read-only tools', () => {
    it('returns cached result on identical call', () => {
      const dedup = new ToolDeduplicator();
      const params = { path: '/tmp/file.txt' };
      const result = { content: 'hello' };

      dedup.recordResult('read_file', params, result);
      const check = dedup.shouldExecute('read_file', params);

      expect(check.execute).toBe(false);
      expect(check.cached).toEqual(result);
    });

    it('executes when params differ', () => {
      const dedup = new ToolDeduplicator();
      dedup.recordResult('read_file', { path: '/a' }, { content: 'a' });
      const check = dedup.shouldExecute('read_file', { path: '/b' });
      expect(check.execute).toBe(true);
    });

    it('evicts oldest entries when window exceeds size', () => {
      const dedup = new ToolDeduplicator(2);
      dedup.recordResult('read_file', { path: '/a' }, { content: 'a' });
      dedup.recordResult('read_file', { path: '/b' }, { content: 'b' });
      dedup.recordResult('read_file', { path: '/c' }, { content: 'c' });

      const check = dedup.shouldExecute('read_file', { path: '/a' });
      expect(check.execute).toBe(true); // evicted
    });
  });

  describe('write tools', () => {
    it('never caches write tools', () => {
      const dedup = new ToolDeduplicator();
      dedup.recordResult('write_file', { path: '/a' }, { ok: true });
      const check = dedup.shouldExecute('write_file', { path: '/a' });
      expect(check.execute).toBe(true);
      expect(check.cached).toBeUndefined();
    });
  });

  describe('normalization', () => {
    it('treats same params with different key order as identical', () => {
      const dedup = new ToolDeduplicator();
      dedup.recordResult(
        'read_file',
        { path: '/a', limit: 10 },
        { content: 'x' },
      );
      const check = dedup.shouldExecute('read_file', { limit: 10, path: '/a' });
      expect(check.execute).toBe(false);
      expect(check.cached).toEqual({ content: 'x' });
    });
  });

  describe('invalidate', () => {
    it('removes cached entries for a tool', () => {
      const dedup = new ToolDeduplicator();
      dedup.recordResult('read_file', { path: '/a' }, { content: 'a' });
      dedup.invalidate('read_file');
      const check = dedup.shouldExecute('read_file', { path: '/a' });
      expect(check.execute).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all caches', () => {
      const dedup = new ToolDeduplicator();
      dedup.recordResult('read_file', { path: '/a' }, { content: 'a' });
      dedup.reset();
      const check = dedup.shouldExecute('read_file', { path: '/a' });
      expect(check.execute).toBe(true);
    });
  });
});
