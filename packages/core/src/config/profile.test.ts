/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileManager } from './profile-types.js';
import { Config, ApprovalMode } from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn().mockReturnValue('/tmp/fake-home'),
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

describe('ProfileManager', () => {
  let tmpDir: string;
  let manager: ProfileManager;

  beforeEach(() => {
    fs.mkdirSync('/tmp/fake-home', { recursive: true });
    tmpDir = fs.mkdtempSync(path.join('/tmp/fake-home', 'qwen-profile-'));
    manager = new ProfileManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync('/tmp/fake-home', { recursive: true, force: true });
  });

  it('creates profiles directory if missing', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'profiles');
    const nestedManager = new ProfileManager(nestedDir);
    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(nestedManager.list()).toEqual([]);
  });

  it('saves and loads a profile', () => {
    const profile = {
      name: 'Test',
      globalInitPrompts: ['~/test.md'],
      appendSystemPrompt: 'You are Test.',
    };
    manager.save('test', profile);
    const loaded = manager.load('test');
    expect(loaded).toEqual(profile);
  });

  it('lists profiles', () => {
    manager.save('a', { name: 'A' });
    manager.save('b', { name: 'B' });
    const list = manager.list();
    expect(list.sort()).toEqual(['a', 'b']);
  });

  it('deletes a profile', () => {
    manager.save('del', { name: 'Delete' });
    manager.delete('del');
    expect(() => manager.load('del')).toThrow('Profile not found: del');
  });

  it('throws on missing profile', () => {
    expect(() => manager.load('missing')).toThrow('Profile not found: missing');
  });

  it('throws on invalid profile JSON', () => {
    const profilePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(profilePath, 'not json', 'utf8');
    expect(() => manager.load('bad')).toThrow();
  });

  it('throws on profile missing name field', () => {
    const profilePath = path.join(tmpDir, 'noname.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({ globalInitPrompts: [] }),
      'utf8',
    );
    expect(() => manager.load('noname')).toThrow(
      'Profile missing required field',
    );
  });

  it('creates default profiles only if missing', () => {
    manager.createDefaultProfiles();
    expect(manager.list()).toContain('lyra');
    expect(manager.list()).toContain('aria');
    expect(manager.list()).toContain('coda');
    expect(manager.list()).toContain('vesta');

    const lyra = manager.load('lyra');
    expect(lyra.name).toBe('Lyra');
    expect(lyra.globalInitPrompts?.length).toBeGreaterThan(0);

    // Should not overwrite existing
    manager.save('aria', { name: 'Aria', appendSystemPrompt: 'Custom' });
    manager.createDefaultProfiles();
    const ariaAfter = manager.load('aria');
    expect(ariaAfter.appendSystemPrompt).toBe('Custom');
  });

  it('filters non-string items from globalInitPrompts', () => {
    const profilePath = path.join(tmpDir, 'mixed.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        name: 'Mixed',
        globalInitPrompts: ['ok', 123, true, 'also'],
      }),
      'utf8',
    );
    const loaded = manager.load('mixed');
    expect(loaded.globalInitPrompts).toEqual(['ok', 'also']);
  });
});

describe('Config profile loading', () => {
  let tmpDir: string;
  let profileDir: string;

  beforeEach(() => {
    fs.mkdirSync('/tmp/fake-home', { recursive: true });
    tmpDir = fs.mkdtempSync(path.join('/tmp/fake-home', 'qwen-config-'));
    profileDir = path.join('/tmp/fake-home', '.qwen-lyra', 'profiles');
    fs.mkdirSync(profileDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync('/tmp/fake-home', { recursive: true, force: true });
  });

  it('loads profile globalInitPrompts before settings globalInitPrompts', () => {
    const profileFile = path.join(tmpDir, 'profile.md');
    const settingsFile = path.join(tmpDir, 'settings.md');
    fs.writeFileSync(profileFile, 'profile', 'utf8');
    fs.writeFileSync(settingsFile, 'settings', 'utf8');

    fs.writeFileSync(
      path.join(profileDir, 'test.json'),
      JSON.stringify({ name: 'Test', globalInitPrompts: [profileFile] }),
      'utf8',
    );

    const config = new Config({
      ...baseParams,
      profileName: 'test',
      globalInitPrompts: [settingsFile],
    });

    const result = config.getGlobalInitPrompts();
    const profileIdx = result.indexOf('profile');
    const settingsIdx = result.indexOf('settings');
    expect(profileIdx).toBeLessThan(settingsIdx);
  });

  it('throws when profile is missing', () => {
    expect(() => {
      new Config({
        ...baseParams,
        profileName: 'nonexistent',
      });
    }).toThrow('Profile not found: nonexistent');
  });

  it('merges profile appendSystemPrompt with settings appendSystemPrompt', () => {
    fs.writeFileSync(
      path.join(profileDir, 'append.json'),
      JSON.stringify({ name: 'Append', appendSystemPrompt: 'Profile append.' }),
      'utf8',
    );

    const config = new Config({
      ...baseParams,
      profileName: 'append',
      appendSystemPrompt: 'Settings append.',
    });

    expect(config.getProfileAppendSystemPrompt()).toBe('Profile append.');
    expect(config.getAppendSystemPrompt()).toBe('Settings append.');
  });

  it('handles empty profile gracefully', () => {
    fs.writeFileSync(
      path.join(profileDir, 'empty.json'),
      JSON.stringify({ name: 'Empty' }),
      'utf8',
    );

    const config = new Config({
      ...baseParams,
      profileName: 'empty',
    });

    expect(config.getGlobalInitPrompts()).toBe('');
    expect(config.getProfileAppendSystemPrompt()).toBeUndefined();
  });
});
