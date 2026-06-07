/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PluginRegistry } from './registry.js';
import type { PluginManifest } from './types.js';

const mockManifest: PluginManifest = {
  name: 'docker-helper',
  version: '1.0.0',
  description: 'Docker assistance',
  author: 'test',
  entry: 'index.js',
  hooks: ['session-start'],
  provides: { tools: ['docker_inspect'] },
};

describe('PluginRegistry', () => {
  const registry = new PluginRegistry();

  it('registers a plugin', () => {
    registry.register(mockManifest);
    expect(registry.listInstalled()).toHaveLength(1);
    expect(registry.listInstalled()[0]!.name).toBe('docker-helper');
  });

  it('finds a plugin by name', () => {
    const found = registry.get('docker-helper');
    expect(found).toBeDefined();
    expect(found!.version).toBe('1.0.0');
  });

  it('returns undefined for unknown plugin', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('unregisters a plugin', () => {
    registry.unregister('docker-helper');
    expect(registry.get('docker-helper')).toBeUndefined();
  });

  it('tracks enabled/disabled state', () => {
    registry.register(mockManifest);
    expect(registry.isEnabled('docker-helper')).toBe(true);
    registry.disable('docker-helper');
    expect(registry.isEnabled('docker-helper')).toBe(false);
    registry.enable('docker-helper');
    expect(registry.isEnabled('docker-helper')).toBe(true);
  });

  it('lists hooks for a plugin', () => {
    const hooks = registry.getHooks('docker-helper');
    expect(hooks).toContain('session-start');
  });

  it('returns provided tools', () => {
    const tools = registry.getProvidedTools();
    expect(tools).toContain('docker_inspect');
  });

  it('returns provided commands', () => {
    registry.register({
      ...mockManifest,
      name: 'cmd-plugin',
      provides: { commands: ['/test'] },
    });
    const commands = registry.getProvidedCommands();
    expect(commands).toContain('/test');
  });
});
