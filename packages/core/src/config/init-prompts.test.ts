/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Config, ApprovalMode } from './config.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
  };
});

const baseParams = {
  cwd: '/tmp/qwen-test',
  targetDir: '/tmp/qwen-test',
  approvedTools: new Set<string>(),
  deniedTools: new Set<string>(),
  mcpServers: {},
  mcpTools: [],
  interactive: true,
  approvalMode: ApprovalMode.DEFAULT,
  provider: 'google',
  model: 'gemini-1.5-pro-latest',
  debugMode: false,
  question: '',
  emitToolUseSummaries: true,
  shouldUseNodePtyShell: false,
  skipNextSpeakerCheck: false,
  useRipgrep: false,
  useBuiltinRipgrep: false,
  bareMode: false,
};

describe('getGlobalInitPrompts merge order', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('merges settings + env + cli in order', () => {
    const file1 = path.join(tmpDir, 'settings.md');
    const file2 = path.join(tmpDir, 'env.md');
    const file3 = path.join(tmpDir, 'cli.md');
    fs.writeFileSync(file1, 'settings', 'utf8');
    fs.writeFileSync(file2, 'env', 'utf8');
    fs.writeFileSync(file3, 'cli', 'utf8');

    const config = new Config({
      ...baseParams,
      globalInitPrompts: [file1],
      initPromptsFromEnv: [file2],
      initPromptsFromCli: [file3],
    });

    const result = config.getGlobalInitPrompts();
    expect(result).toContain('settings');
    expect(result).toContain('env');
    expect(result).toContain('cli');
    // Order: settings, env, cli
    const settingsIdx = result.indexOf('settings');
    const envIdx = result.indexOf('env');
    const cliIdx = result.indexOf('cli');
    expect(settingsIdx).toBeLessThan(envIdx);
    expect(envIdx).toBeLessThan(cliIdx);
  });

  it('skips missing files gracefully', () => {
    const config = new Config({
      ...baseParams,
      globalInitPrompts: ['/nonexistent/file.md'],
    });
    expect(() => config.getGlobalInitPrompts()).not.toThrow();
    expect(config.getGlobalInitPrompts()).toBe('');
  });

  it('caches content and re-reads on mtime change', () => {
    const file = path.join(tmpDir, 'prompt.md');
    fs.writeFileSync(file, 'v1', 'utf8');

    const config = new Config({
      ...baseParams,
      globalInitPrompts: [file],
    });

    const first = config.getGlobalInitPrompts();
    expect(first).toBe('v1');

    // Cache should return same content
    const second = config.getGlobalInitPrompts();
    expect(second).toBe('v1');

    // Change file
    fs.writeFileSync(file, 'v2', 'utf8');

    const third = config.getGlobalInitPrompts();
    expect(third).toBe('v2');
  });

  it('resolves tilde paths to home directory', () => {
    const home = os.homedir();
    const file = path.join(tmpDir, 'tilde.md');
    const relativePath = file.replace(home, '~');
    fs.writeFileSync(file, 'tilde', 'utf8');

    const config = new Config({
      ...baseParams,
      globalInitPrompts: [relativePath],
    });

    expect(config.getGlobalInitPrompts()).toBe('tilde');
  });

  it('concatenates multiple files with --- separator', () => {
    const file1 = path.join(tmpDir, 'a.md');
    const file2 = path.join(tmpDir, 'b.md');
    fs.writeFileSync(file1, 'first', 'utf8');
    fs.writeFileSync(file2, 'second', 'utf8');

    const config = new Config({
      ...baseParams,
      globalInitPrompts: [file1, file2],
    });

    const result = config.getGlobalInitPrompts();
    expect(result).toContain('first');
    expect(result).toContain('second');
    expect(result).toContain('---');
  });
});
