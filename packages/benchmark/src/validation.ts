/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { ValidationMethod } from './types.js';

export async function validateResult(
  method: ValidationMethod,
): Promise<boolean> {
  switch (method.type) {
    case 'file_exists': {
      const path = method.params['path'] as string;
      return existsSync(path);
    }
    case 'file_contains': {
      const path = method.params['path'] as string;
      const contains = method.params['contains'] as string;
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes(contains);
    }
    case 'command_succeeds': {
      const command = method.params['command'] as string;
      try {
        execSync(command, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
    case 'custom': {
      const fn = method.params['fn'] as
        | ((params: Record<string, unknown>) => boolean | Promise<boolean>)
        | undefined;
      if (typeof fn !== 'function') {
        throw new Error('Custom validation requires a fn parameter');
      }
      return await fn(method.params);
    }
    default:
      throw new Error(`Unknown validation type: ${method.type}`);
  }
}
