#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import * as path from 'node:path';

// Redirect QWEN_HOME to ~/.qwen-lyra so this fork uses its own config,
// memory, and runtime directory. Honors an explicit user override.
if (!process.env['QWEN_HOME']) {
  process.env['QWEN_HOME'] = path.join(os.homedir(), '.qwen-lyra');
}

import { runCliEntryPoint } from './src/cli.js';

// --- Global Entry Point ---

void runCliEntryPoint();
