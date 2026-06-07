/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PluginManifest, HookName } from './types.js';

export class PluginRegistry {
  private plugins = new Map<string, PluginManifest>();
  private enabled = new Set<string>();

  register(manifest: PluginManifest): void {
    this.plugins.set(manifest.name, manifest);
    this.enabled.add(manifest.name);
  }

  unregister(name: string): void {
    this.plugins.delete(name);
    this.enabled.delete(name);
  }

  get(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  listInstalled(): PluginManifest[] {
    return [...this.plugins.values()];
  }

  isEnabled(name: string): boolean {
    return this.enabled.has(name);
  }

  enable(name: string): void {
    if (this.plugins.has(name)) {
      this.enabled.add(name);
    }
  }

  disable(name: string): void {
    this.enabled.delete(name);
  }

  getHooks(name: string): HookName[] {
    const plugin = this.plugins.get(name);
    return plugin?.hooks ?? [];
  }

  getProvidedTools(): string[] {
    const tools: string[] = [];
    for (const [name, plugin] of this.plugins) {
      if (this.enabled.has(name) && plugin.provides?.tools) {
        tools.push(...plugin.provides.tools);
      }
    }
    return tools;
  }

  getProvidedCommands(): string[] {
    const commands: string[] = [];
    for (const [name, plugin] of this.plugins) {
      if (this.enabled.has(name) && plugin.provides?.commands) {
        commands.push(...plugin.provides.commands);
      }
    }
    return commands;
  }

  getEnabledPlugins(): PluginManifest[] {
    return [...this.plugins.values()].filter((p) => this.enabled.has(p.name));
  }
}
