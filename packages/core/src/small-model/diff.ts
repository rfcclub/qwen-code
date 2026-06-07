/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';

export class DiffPreview {
  preview(filePath: string, search: string, replace: string): string {
    const content = readFileSync(filePath, 'utf-8');
    const idx = content.indexOf(search);
    if (idx < 0) {
      return 'No match found for patch preview.';
    }

    const lines = content.split('\n');
    let lineNum = 0;
    let pos = 0;
    for (const line of lines) {
      if (pos <= idx && idx < pos + line.length + 1) {
        break;
      }
      pos += line.length + 1;
      lineNum++;
    }

    const before = lines.slice(Math.max(0, lineNum - 2), lineNum);
    const after = lines.slice(lineNum + 1, lineNum + 3);

    return [
      `--- ${filePath}`,
      ...before.map((l) => ` ${l}`),
      `-${search}`,
      `+${replace}`,
      ...after.map((l) => ` ${l}`),
    ].join('\n');
  }

  stats(preview: string): { additions: number; removals: number } {
    const lines = preview.split('\n');
    const additions = lines.filter(
      (l) => l.startsWith('+') && !l.startsWith('---'),
    ).length;
    const removals = lines.filter(
      (l) => l.startsWith('-') && !l.startsWith('---'),
    ).length;
    return { additions, removals };
  }
}
