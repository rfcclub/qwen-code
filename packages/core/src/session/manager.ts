/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Session, SessionMessage } from './types.js';

let idCounter = 0;

function generateId(): string {
  return `sess-${Date.now()}-${++idCounter}`;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private activeId: string | undefined;

  create(name: string, workingDirectory = process.cwd()): Session {
    const id = generateId();
    const session: Session = {
      id,
      name,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      workingDirectory,
      history: [],
      context: {},
    };
    this.sessions.set(id, session);
    this.activeId = id;
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  getActive(): Session | undefined {
    return this.activeId ? this.sessions.get(this.activeId) : undefined;
  }

  switch(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeId = id;
      const session = this.sessions.get(id)!;
      session.status = 'active';
      session.lastActiveAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  pause(id: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.status = 'paused';
      return true;
    }
    return false;
  }

  resume(id: string): boolean {
    return this.switch(id);
  }

  kill(id: string): boolean {
    const removed = this.sessions.delete(id);
    if (removed && this.activeId === id) {
      this.activeId = undefined;
    }
    return removed;
  }

  rename(id: string, name: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.name = name;
      return true;
    }
    return false;
  }

  export(id: string): string {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return JSON.stringify(session, null, 2);
  }

  import(data: string): Session {
    const session: Session = JSON.parse(data);
    this.sessions.set(session.id, session);
    return session;
  }

  killAll(): void {
    this.sessions.clear();
    this.activeId = undefined;
  }

  publish(message: SessionMessage, target?: string): void {
    // Placeholder for inter-session communication
    if (target) {
      const session = this.sessions.get(target);
      if (session) {
        (session.context['messages'] as SessionMessage[] | undefined)?.push(
          message,
        );
      }
    }
  }
}
