/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { Patch, PatchResult } from './types.js';

/**
 * Patch Engine — applies search-and-replace edits as the primary
 * editing primitive instead of full-file rewrites.
 *
 * Supports:
 * - Exact match (confidence 1.0)
 * - Fuzzy match via whitespace normalization (confidence 0.8)
 * - Line-range constrained matching
 * - Multi-line patches
 */
export class PatchEngine {
  /**
   * Apply a set of patches to a file.
   */
  apply(filePath: string, patches: Patch[]): PatchResult {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (e) {
      return {
        success: false,
        patchCount: 0,
        confidence: 0,
        error: `Cannot read file: ${(e as Error).message}`,
      };
    }

    let current = content;
    let applied = 0;
    let totalConfidence = 0;

    for (const patch of patches) {
      const result = this.applySinglePatch(current, patch);
      if (result.success) {
        current = result.content;
        applied++;
        totalConfidence += result.confidence;
      }
    }

    try {
      writeFileSync(filePath, current, 'utf-8');
    } catch (e) {
      return {
        success: false,
        patchCount: applied,
        confidence: 0,
        error: `Cannot write file: ${(e as Error).message}`,
      };
    }

    return {
      success: applied === patches.length,
      patchCount: applied,
      confidence: patches.length > 0 ? totalConfidence / patches.length : 1.0,
    };
  }

  /**
   * Apply a single patch operation.
   */
  applySinglePatch(
    content: string,
    patch: Patch,
  ): { success: boolean; content: string; confidence: number } {
    if (patch.type === 'insert') {
      // Locate insertion point (after `search` or at end)
      const insertionPoint = patch.search
        ? content.lastIndexOf(patch.search)
        : -1;
      if (insertionPoint >= 0) {
        const insertAfter = insertionPoint + patch.search.length;
        return {
          success: true,
          content:
            content.slice(0, insertAfter) +
            (patch.replace ?? '') +
            content.slice(insertAfter),
          confidence: 1.0,
        };
      }
      // Fallback: append at end
      return {
        success: true,
        content: content + '\n' + (patch.replace ?? ''),
        confidence: 0.5,
      };
    }

    if (patch.type === 'delete') {
      const idx = content.indexOf(patch.search);
      if (idx >= 0) {
        return {
          success: true,
          content:
            content.slice(0, idx) + content.slice(idx + patch.search.length),
          confidence: 1.0,
        };
      }
      return { success: false, content, confidence: 0 };
    }

    // replace
    // 1. Exact match
    const exactIdx = content.indexOf(patch.search);
    if (exactIdx >= 0) {
      return {
        success: true,
        content:
          content.slice(0, exactIdx) +
          (patch.replace ?? '') +
          content.slice(exactIdx + patch.search.length),
        confidence: 1.0,
      };
    }

    // 2. Fuzzy match (if enabled)
    if (patch.fuzzy) {
      const fuzzy = this.fuzzyMatch(content, patch.search);
      if (fuzzy) {
        return {
          success: true,
          content:
            content.slice(0, fuzzy.pos) +
            (patch.replace ?? '') +
            content.slice(fuzzy.pos + fuzzy.matchLen),
          confidence: 0.8,
        };
      }
    }

    // 3. Line-range match
    if (patch.lineRange) {
      const lines = content.split('\n');
      if (patch.lineRange.start >= 0 && patch.lineRange.end < lines.length) {
        const selected = lines.slice(
          patch.lineRange.start,
          patch.lineRange.end + 1,
        );
        const selectedStr = selected.join('\n');
        const matchInside = selectedStr.indexOf(patch.search);
        if (matchInside >= 0) {
          const absolutePos =
            lines.slice(0, patch.lineRange.start).join('\n').length +
            (patch.lineRange.start > 0 ? 1 : 0) +
            matchInside;
          return {
            success: true,
            content:
              content.slice(0, absolutePos) +
              (patch.replace ?? '') +
              content.slice(absolutePos + patch.search.length),
            confidence: 0.9,
          };
        }
      }
    }

    return { success: false, content, confidence: 0 };
  }

  /**
   * Fuzzy match: normalize whitespace and line endings.
   */
  private fuzzyMatch(
    content: string,
    search: string,
  ): { pos: number; matchLen: number } | null {
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const normalizedContent = normalize(content);
    const normalizedSearch = normalize(search);

    const idx = normalizedContent.indexOf(normalizedSearch);
    if (idx < 0) return null;

    // Map back to original content position
    const origIdx = this.mapPosition(content, normalizedContent, idx);
    if (origIdx < 0) return null;

    return { pos: origIdx, matchLen: search.length };
  }

  /**
   * Map normalized position back to original content position.
   */
  private mapPosition(
    original: string,
    normalized: string,
    normPos: number,
  ): number {
    let origIdx = 0;
    let normIdx = 0;

    while (origIdx < original.length && normIdx < normPos) {
      const origChar = original[origIdx]!;
      if (/\s/.test(origChar)) {
        // In normalized string, consecutive whitespace → single space
        if (normIdx < normalized.length && normalized[normIdx] === ' ') {
          normIdx++;
        }
        origIdx++;
      } else {
        if (origChar === normalized[normIdx]) {
          normIdx++;
        }
        origIdx++;
      }
    }

    return normIdx >= normPos ? origIdx : -1;
  }
}
