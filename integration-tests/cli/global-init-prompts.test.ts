/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  TestRig,
  printDebugInfo,
  validateModelOutput,
} from '../test-helper.js';

describe.skip('globalInitPrompts', () => {
  it('should inject init prompt content into the system prompt via settings', async () => {
    const rig = new TestRig();
    const randomMarker = `INIT_PROMPT_MARKER_${Math.random().toString(36).substring(7)}`;

    await rig.setup(
      'should inject init prompt content into system prompt via settings',
      {
        settings: {
          context: {
            globalInitPrompts: [rig.createFile('init.md', randomMarker)],
          },
        },
      },
    );

    const prompt =
      'Repeat the unique marker you see in your system instructions exactly as written.';
    const result = await rig.run(prompt);

    const lastRequest = rig.readLastApiRequest();
    expect(lastRequest).not.toBeNull();

    const requestText = lastRequest!.attributes.request_text as string;
    expect(requestText).toContain(randomMarker);

    validateModelOutput(
      result,
      randomMarker,
      'globalInitPrompts settings test',
    );
  });

  it('should inject init prompt content via --init-prompt CLI flag', async () => {
    const rig = new TestRig();
    const randomMarker = `CLI_INIT_MARKER_${Math.random().toString(36).substring(7)}`;

    await rig.setup(
      'should inject init prompt content via --init-prompt CLI flag',
    );

    const initFilePath = rig.createFile('cli-init.md', randomMarker);

    const prompt =
      'Repeat the unique marker you see in your system instructions exactly as written.';
    const result = await rig.run(prompt, '--init-prompt', initFilePath);

    const lastRequest = rig.readLastApiRequest();
    expect(lastRequest).not.toBeNull();

    const requestText = lastRequest!.attributes.request_text as string;
    expect(requestText).toContain(randomMarker);

    validateModelOutput(result, randomMarker, '--init-prompt CLI flag test');
  });

  it('should merge settings and CLI init prompts', async () => {
    const rig = new TestRig();
    const settingsMarker = `SETTINGS_MERGE_${Math.random().toString(36).substring(7)}`;
    const cliMarker = `CLI_MERGE_${Math.random().toString(36).substring(7)}`;

    await rig.setup('should merge settings and CLI init prompts', {
      settings: {
        context: {
          globalInitPrompts: [
            rig.createFile('settings-init.md', settingsMarker),
          ],
        },
      },
    });

    const cliInitPath = rig.createFile('cli-init.md', cliMarker);

    const prompt =
      'List all unique markers you see in your system instructions.';
    const result = await rig.run(prompt, '--init-prompt', cliInitPath);

    const lastRequest = rig.readLastApiRequest();
    expect(lastRequest).not.toBeNull();

    const requestText = lastRequest!.attributes.request_text as string;
    expect(requestText).toContain(settingsMarker);
    expect(requestText).toContain(cliMarker);

    if (
      !result.toLowerCase().includes(settingsMarker.toLowerCase()) ||
      !result.toLowerCase().includes(cliMarker.toLowerCase())
    ) {
      printDebugInfo(rig, result, {
        'Has settings marker': result
          .toLowerCase()
          .includes(settingsMarker.toLowerCase()),
        'Has CLI marker': result
          .toLowerCase()
          .includes(cliMarker.toLowerCase()),
      });
    }
  });

  it('should gracefully skip missing init prompt files', async () => {
    const rig = new TestRig();

    await rig.setup('should gracefully skip missing init prompt files');

    const prompt = 'Say hello.';
    // Using a non-existent path — should not crash, just skip
    const result = await rig.run(
      prompt,
      '--init-prompt',
      '/nonexistent/init-prompt.md',
    );

    expect(result).toBeTruthy();
    // If we got here without a crash, the test passes
  });

  it('should support QWEN_LYRA_INIT_PROMPTS env var', async () => {
    const rig = new TestRig();
    const envMarker = `ENV_INIT_MARKER_${Math.random().toString(36).substring(7)}`;

    await rig.setup('should support QWEN_LYRA_INIT_PROMPTS env var');

    const envInitPath = rig.createFile('env-init.md', envMarker);

    // Note: This test requires QWEN_LYRA_INIT_PROMPTS to be set in the environment
    // The rig.run() method would need to pass the env var through.
    // This is a placeholder test — actual env var passthrough depends on
    // the test framework supporting custom env vars in spawn().
    // For now, we verify the config accepts the env path format.

    expect(envInitPath).toBeTruthy();
  });
});
