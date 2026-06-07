/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';

export interface Profile {
  name: string;
  globalInitPrompts?: string[];
  appendSystemPrompt?: string;
}

export class ProfileManager {
  private readonly profilesDir: string;

  constructor(profilesDir?: string) {
    this.profilesDir =
      profilesDir ?? path.join(homedir(), '.qwen-lyra', 'profiles');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  getProfilesDir(): string {
    return this.profilesDir;
  }

  load(name: string): Profile {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile not found: ${name}`);
    }
    const content = fs.readFileSync(profilePath, 'utf8');
    const profile = JSON.parse(content) as unknown;
    if (
      typeof profile !== 'object' ||
      profile === null ||
      Array.isArray(profile)
    ) {
      throw new Error(`Invalid profile file: ${name}`);
    }
    const parsed = profile as Record<string, unknown>;
    if (typeof parsed['name'] !== 'string') {
      throw new Error(`Profile missing required field "name": ${name}`);
    }
    return {
      name: parsed['name'],
      globalInitPrompts: Array.isArray(parsed['globalInitPrompts'])
        ? parsed['globalInitPrompts'].filter(
            (p): p is string => typeof p === 'string',
          )
        : undefined,
      appendSystemPrompt:
        typeof parsed['appendSystemPrompt'] === 'string'
          ? parsed['appendSystemPrompt']
          : undefined,
    };
  }

  save(name: string, profile: Profile): void {
    this.ensureDir();
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  list(): string[] {
    this.ensureDir();
    if (!fs.existsSync(this.profilesDir)) {
      return [];
    }
    return fs
      .readdirSync(this.profilesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }

  delete(name: string): void {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile not found: ${name}`);
    }
    fs.unlinkSync(profilePath);
  }

  createDefaultProfiles(): void {
    this.ensureDir();
    const defaults: Record<string, Profile> = {
      lyra: {
        name: 'Lyra',
        globalInitPrompts: [
          '~/agora/familia/lyra/prism/axes.md',
          '~/agora/familia/lyra/prism/broken_stone.md',
          '~/agora/familia/lyra/prism/convergences.md',
          '~/agora/familia/lyra/prism/divergences.md',
        ],
        appendSystemPrompt: 'You are Lyra, the prism agent.',
      },
      aria: {
        name: 'Aria',
        globalInitPrompts: [],
        appendSystemPrompt: 'You are Aria, the emanation agent.',
      },
      coda: {
        name: 'Coda',
        globalInitPrompts: [],
        appendSystemPrompt: 'You are Coda, the resonance agent.',
      },
      vesta: {
        name: 'Vesta',
        globalInitPrompts: [],
        appendSystemPrompt: 'You are Vesta, the hearth agent.',
      },
    };

    for (const [name, profile] of Object.entries(defaults)) {
      const profilePath = path.join(this.profilesDir, `${name}.json`);
      if (!fs.existsSync(profilePath)) {
        this.save(name, profile);
      }
    }
  }
}
