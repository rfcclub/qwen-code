/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateResult } from './validation.js';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validateResult', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = join(tmpdir(), `bench-val-${Date.now()}.txt`);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it('validates file_exists', async () => {
    writeFileSync(tmpFile, 'hello', 'utf-8');
    const result = await validateResult({
      type: 'file_exists',
      params: { path: tmpFile },
    });
    expect(result).toBe(true);
  });

  it('fails file_exists for missing file', async () => {
    const result = await validateResult({
      type: 'file_exists',
      params: { path: '/nonexistent/file' },
    });
    expect(result).toBe(false);
  });

  it('validates file_contains', async () => {
    writeFileSync(tmpFile, 'hello world', 'utf-8');
    const result = await validateResult({
      type: 'file_contains',
      params: { path: tmpFile, contains: 'world' },
    });
    expect(result).toBe(true);
  });

  it('fails file_contains when text missing', async () => {
    writeFileSync(tmpFile, 'hello world', 'utf-8');
    const result = await validateResult({
      type: 'file_contains',
      params: { path: tmpFile, contains: 'missing' },
    });
    expect(result).toBe(false);
  });

  it('validates command_succeeds', async () => {
    const result = await validateResult({
      type: 'command_succeeds',
      params: { command: 'echo hello' },
    });
    expect(result).toBe(true);
  });

  it('fails command_succeeds when command errors', async () => {
    const result = await validateResult({
      type: 'command_succeeds',
      params: { command: 'exit 1' },
    });
    expect(result).toBe(false);
  });

  it('throws on unknown validation type', async () => {
    await expect(
      validateResult({
        type: 'custom' as unknown as 'file_exists',
        params: {},
      }),
    ).rejects.toThrow('Unknown validation type');
  });
});
