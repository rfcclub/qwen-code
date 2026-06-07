/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvidenceStore } from './store.js';
import type { Evidence } from './types.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

describe('EvidenceStore', () => {
  let tmpDir: string;
  let store: EvidenceStore;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'evidence-'));
    store = new EvidenceStore(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const sample: Evidence = {
    id: 'e1',
    timestamp: new Date().toISOString(),
    sessionId: 's1',
    taskId: 't1',
    type: 'gotcha',
    title: 'Do not use rm -rf',
    description: 'Use npm ci instead',
    context: 'node_modules cleanup',
    outcome: 'success',
    confidence: 0.9,
    tags: ['node', 'cleanup'],
  };

  it('saves and retrieves evidence', () => {
    store.save(sample);
    const all = store.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe('Do not use rm -rf');
  });

  it('finds evidence by id', () => {
    store.save(sample);
    const found = store.get('e1');
    expect(found).toBeDefined();
    expect(found!.id).toBe('e1');
  });

  it('returns undefined for unknown id', () => {
    expect(store.get('unknown')).toBeUndefined();
  });

  it('searches by tag', () => {
    store.save(sample);
    store.save({ ...sample, id: 'e2', tags: ['docker'] });
    const results = store.search({ tag: 'node' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('e1');
  });

  it('searches by type', () => {
    store.save(sample);
    store.save({ ...sample, id: 'e2', type: 'convention' });
    const results = store.search({ type: 'gotcha' });
    expect(results).toHaveLength(1);
    expect(results[0]!.type).toBe('gotcha');
  });

  it('scores relevance by confidence', () => {
    store.save({ ...sample, confidence: 0.9 });
    store.save({ ...sample, id: 'e2', confidence: 0.5 });
    const results = store.search({});
    expect(results[0]!.confidence).toBeGreaterThanOrEqual(
      results[1]!.confidence,
    );
  });

  it('deletes evidence', () => {
    store.save(sample);
    store.delete('e1');
    expect(store.get('e1')).toBeUndefined();
  });

  it('exports and imports evidence', () => {
    store.save(sample);
    const exported = store.export();
    expect(exported.length).toBe(1);

    const newStore = new EvidenceStore(tmpDir);
    newStore.import(exported);
    expect(newStore.list()).toHaveLength(1);
  });
});
