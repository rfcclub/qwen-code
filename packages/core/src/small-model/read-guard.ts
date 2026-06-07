/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, existsSync } from 'node:fs';

export { ReadBeforeWriteGuard } from './write-guard.js';

/**
 * Context-Aware Read Guard — returns intelligent content
 * within token budget rather than whole files.
 *
 * Uses head + tail strategy: shows the beginning and end of
 * large files with a summary of omitted content in between.
 * Also preserves section markers when truncating.
 */
export class ReadGuard {
  /**
   * Read a file with intelligent truncation within a token budget.
   */
  readFile(filePath: string, budgetChars: number): string {
    if (!existsSync(filePath)) return `File not found: ${filePath}`;
    const content = readFileSync(filePath, 'utf-8');
    if (content.length <= budgetChars) return content;

    return this.truncateWithSections(content, budgetChars);
  }

  /**
   * Truncate content preserving section markers.
   * Shows head + tail with omitted section noted in between.
   */
  private truncateWithSections(content: string, budgetChars: number): string {
    const headLen = Math.floor(budgetChars * 0.4);
    const tailLen = Math.floor(budgetChars * 0.4);
    const omitted = content.length - headLen - tailLen;

    const head = content.slice(0, headLen);
    const tail = content.slice(-tailLen);

    // If there are section markers in the omitted region, preserve them
    const omittedRegion = content.slice(headLen, content.length - tailLen);
    const sectionMarkers = this.extractSectionMarkers(omittedRegion);

    let sectionNote = '';
    if (sectionMarkers.length > 0) {
      sectionNote = `\n[Sections in omitted region: ${sectionMarkers.join(', ')}]\n`;
    }

    return (
      head +
      `\n\n[... ${omitted.toLocaleString()} characters omitted for token budget ...]\n` +
      sectionNote +
      `\n` +
      tail
    );
  }

  /**
   * Extract section headers from a region of text.
   * Matches patterns like "# Section: X", "## Section X", etc.
   */
  private extractSectionMarkers(text: string): string[] {
    const regex = /^#+\s*Section[:\s]+(.+)$/gim;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        matches.push(match[1].trim());
      }
    }
    return matches;
  }
}
