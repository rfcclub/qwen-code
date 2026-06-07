/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Evidence } from './types.js';

export class EvidenceStore {
  private dir: string;
  private cache: Map<string, Evidence> = new Map();

  constructor(dir: string) {
    this.dir = dir;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.loadAll();
  }

  save(evidence: Evidence): void {
    const filePath = join(this.dir, `${evidence.id}.json`);
    writeFileSync(filePath, JSON.stringify(evidence, null, 2), 'utf-8');
    this.cache.set(evidence.id, evidence);
  }

  get(id: string): Evidence | undefined {
    return this.cache.get(id);
  }

  list(): Evidence[] {
    return [...this.cache.values()];
  }

  delete(id: string): void {
    const filePath = join(this.dir, `${id}.json`);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
    this.cache.delete(id);
  }

  search(query: {
    tag?: string;
    type?: string;
    minConfidence?: number;
  }): Evidence[] {
    let results = this.list();
    if (query.tag) {
      results = results.filter((e) => e.tags.includes(query.tag!));
    }
    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }
    if (query.minConfidence !== undefined) {
      results = results.filter((e) => e.confidence >= query.minConfidence!);
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  export(): Evidence[] {
    return this.list();
  }

  import(evidenceList: Evidence[]): void {
    for (const e of evidenceList) {
      this.save(e);
    }
  }

  private loadAll(): void {
    if (!existsSync(this.dir)) return;
    for (const file of readdirSync(this.dir)) {
      if (file.endsWith('.json')) {
        try {
          const content = readFileSync(join(this.dir, file), 'utf-8');
          const evidence: Evidence = JSON.parse(content);
          this.cache.set(evidence.id, evidence);
        } catch {
          // skip corrupted
        }
      }
    }
  }
}
