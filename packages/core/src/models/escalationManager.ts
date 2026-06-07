/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import {
  classifyErrorForEscalation,
  shouldEscalateOnError,
  type EscalationTrigger,
} from './escalationErrors.js';
import type { EscalationStep, EscalationChainConfig } from './types.js';

const debugLogger = createDebugLogger('ESCALATION');

export { classifyErrorForEscalation, shouldEscalateOnError };
export type { EscalationTrigger };

/**
 * Manages model escalation fallback chains.
 *
 * When a model fails with escalation-worthy errors, this manager selects
 * the next model in the configured chain and switches the active model.
 */
export class EscalationManager {
  private chainConfig: EscalationChainConfig | undefined;
  private originalModel: string | undefined;
  private currentStep = 0;

  constructor(private readonly config: Config) {
    this.loadChainConfig();
  }

  /** Load escalation chain from model providers config. */
  private loadChainConfig(): void {
    const mpc = this.config.getModelsConfig?.();
    const providers = (
      mpc as { modelProvidersConfig?: Record<string, unknown> } | undefined
    )?.modelProvidersConfig;
    if (providers?.['escalationChain']) {
      this.chainConfig = {
        chain: providers['escalationChain'] as EscalationStep[],
        maxSteps: providers['escalationMaxSteps'] as number | undefined,
        restoreOriginal: providers['escalationRestoreOriginal'] !== false,
      };
    }
  }

  /** Whether an escalation chain is configured. */
  hasChain(): boolean {
    return !!this.chainConfig && this.chainConfig.chain.length > 0;
  }

  /** Get the current escalation step (0 = primary model). */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /** Check if the error should trigger escalation to the next step. */
  shouldEscalate(error: unknown): boolean {
    if (!this.hasChain()) return false;

    const errorTriggers = classifyErrorForEscalation(error);
    if (errorTriggers.length === 0) return false;

    const step = this.chainConfig!.chain[this.currentStep];
    if (!step) return false;

    // If no onErrors specified, escalate on any classified error
    if (!step.onErrors || step.onErrors.length === 0) {
      return true;
    }

    return shouldEscalateOnError(errorTriggers, step.onErrors);
  }

  /** Get the next model to escalate to, or undefined if chain exhausted. */
  getNextStep(): EscalationStep | undefined {
    if (!this.hasChain()) return undefined;
    const maxSteps =
      this.chainConfig!.maxSteps ?? this.chainConfig!.chain.length;
    if (this.currentStep >= maxSteps) return undefined;
    return this.chainConfig!.chain[this.currentStep];
  }

  /**
   * Escalate to the next model in the chain.
   * Returns true if escalation succeeded, false if chain exhausted.
   */
  async escalate(): Promise<boolean> {
    const next = this.getNextStep();
    if (!next) {
      debugLogger.warn('Escalation chain exhausted');
      return false;
    }

    // Save original model on first escalation
    if (this.currentStep === 0) {
      this.originalModel = this.config.getModel();
    }

    this.currentStep++;
    debugLogger.info(
      `Escalating to step ${this.currentStep}: ${next.model}` +
        (next.authType ? ` (authType: ${next.authType})` : ''),
    );

    await this.config.setModel(next.model, {
      reason: 'escalation_fallback',
      context: `step ${this.currentStep} of escalation chain`,
    });

    // If authType override, we need to switch auth type too
    // This is handled by setModel if the model is in registry
    // For cross-authType, we may need additional handling
    if (next.authType && next.authType !== this.config.getAuthType?.()) {
      debugLogger.warn(
        `Cross-authType escalation requested (${next.authType}) but not fully supported in this version. ` +
          `Model switch may fail if credentials are missing.`,
      );
    }

    return true;
  }

  /** Restore the original model if configured to do so. */
  async restoreOriginalModel(): Promise<void> {
    if (
      this.originalModel &&
      this.currentStep > 0 &&
      this.chainConfig?.restoreOriginal !== false
    ) {
      debugLogger.info(`Restoring original model: ${this.originalModel}`);
      await this.config.setModel(this.originalModel, {
        reason: 'escalation_restore',
        context: 'restoring original model after escalation',
      });
    }
    this.reset();
  }

  /** Reset escalation state. */
  reset(): void {
    this.currentStep = 0;
    this.originalModel = undefined;
  }
}
