/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SessionManager } from './manager.js';

describe('SessionManager', () => {
  const manager = new SessionManager();

  it('creates a session', () => {
    const session = manager.create('main');
    expect(session.name).toBe('main');
    expect(session.status).toBe('active');
    expect(session.id).toBeDefined();
  });

  it('lists all sessions', () => {
    manager.create('backend');
    const list = manager.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('gets a session by id', () => {
    const session = manager.create('frontend');
    const found = manager.get(session.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('frontend');
  });

  it('returns undefined for unknown session', () => {
    expect(manager.get('unknown')).toBeUndefined();
  });

  it('switches active session', () => {
    manager.create('a');
    const s2 = manager.create('b');
    manager.switch(s2.id);
    expect(manager.getActive()?.id).toBe(s2.id);
  });

  it('pauses a session', () => {
    const session = manager.create('paused-test');
    manager.pause(session.id);
    expect(manager.get(session.id)!.status).toBe('paused');
  });

  it('resumes a paused session', () => {
    const session = manager.create('resume-test');
    manager.pause(session.id);
    manager.resume(session.id);
    expect(manager.get(session.id)!.status).toBe('active');
  });

  it('kills a session', () => {
    const session = manager.create('kill-test');
    manager.kill(session.id);
    expect(manager.get(session.id)).toBeUndefined();
  });

  it('renames a session', () => {
    const session = manager.create('old-name');
    manager.rename(session.id, 'new-name');
    expect(manager.get(session.id)!.name).toBe('new-name');
  });

  it('exports a session', () => {
    const session = manager.create('export-test');
    const exported = manager.export(session.id);
    expect(JSON.parse(exported).name).toBe('export-test');
  });

  it('imports a session', () => {
    const session = manager.create('import-src');
    const exported = manager.export(session.id);
    const imported = manager.import(exported);
    expect(imported.name).toBe('import-src');
  });
});
