/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BenchmarkSuite } from '../types.js';

export const integrationSuite: BenchmarkSuite = {
  name: 'integration',
  description: 'End-to-end multi-step workflows',
  tasks: [
    {
      id: 'integration-react',
      name: 'Create React component with tests',
      type: 'integration',
      prompt: 'Create a React Button component and a corresponding test file',
      validation: {
        type: 'file_exists',
        params: { path: '/tmp/integration-button.tsx' },
      },
      timeout: 60,
    },
    {
      id: 'integration-refactor',
      name: 'Refactor to async/await',
      type: 'integration',
      prompt:
        'Refactor /tmp/integration-fetch.js to use async/await instead of callbacks',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/integration-fetch.js', contains: 'async' },
      },
      timeout: 60,
    },
    {
      id: 'integration-error',
      name: 'Add error handling',
      type: 'integration',
      prompt:
        'Add error handling to /tmp/integration-api.ts for the API endpoint',
      validation: {
        type: 'file_contains',
        params: { path: '/tmp/integration-api.ts', contains: 'try' },
      },
      timeout: 60,
    },
  ],
};
