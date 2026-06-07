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
    default:
      throw new Error(`Unknown validation type: ${method.type}`);
  }
}
