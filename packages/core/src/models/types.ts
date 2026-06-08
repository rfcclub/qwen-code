/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AuthType,
  ContentGeneratorConfig,
  InputModalities,
} from '../core/contentGenerator.js';
import type { ConfigSources } from '../utils/configResolver.js';
import type { EscalationTrigger } from './escalationErrors.js';

/**
 * Model capabilities configuration
 */
export interface ModelCapabilities {
  /** Supports image/vision inputs */
  vision?: boolean;
  /** Can run the normal agent tool loop, not only transcription requests. */
  agent?: boolean;
}

/**
 * Model-scoped generation configuration.
 *
 * Keep this consistent with {@link ContentGeneratorConfig} so modelProviders can
 * feed directly into content generator resolution without shape conversion.
 */
export type ModelGenerationConfig = Pick<
  ContentGeneratorConfig,
  | 'samplingParams'
  | 'timeout'
  | 'maxRetries'
  | 'retryErrorCodes'
  | 'enableCacheControl'
  | 'forceGlobalCacheScope'
  | 'schemaCompliance'
  | 'reasoning'
  | 'customHeaders'
  | 'extra_body'
  | 'contextWindowSize'
  | 'modalities'
  | 'splitToolMedia'
  | 'toolResultContentFormat'
>;

/**
 * Model configuration for a single model within an authType
 */
export interface ModelConfig {
  /** Unique model ID within authType (e.g., "qwen-coder", "gpt-4-turbo") */
  id: string;
  /** Display name (defaults to id) */
  name?: string;
  /** Model description */
  description?: string;
  /** Environment variable name to read API key from (e.g., "OPENAI_API_KEY") */
  envKey?: string;
  /** API endpoint override */
  baseUrl?: string;
  /** Explicit model capabilities used for safe feature routing. */
  capabilities?: ModelCapabilities;
  /** Generation configuration (sampling parameters) */
  generationConfig?: ModelGenerationConfig;
  /** When true, this model only appears in the fast model selector, not the main model list */
  fastOnly?: boolean;
  /** When true, this model only appears in the voice model selector, not the main model list */
  voiceOnly?: boolean;
}

/**
 * Single step in a model escalation fallback chain.
 */
export interface EscalationStep {
  /** Target model ID (or raw model string) */
  model: string;
  /** Optional authType override (defaults to current) */
  authType?: AuthType;
  /** Optional base URL override */
  baseUrl?: string;
  /** Which errors trigger this step (defaults to all) */
  onErrors?: EscalationTrigger[];
}

/**
 * Model providers configuration grouped by provider id.
 * Supports known escalation keys alongside provider/authType keys.
 */
export type ModelProvidersConfig = {
  [providerId: string]:
    | ModelConfig[]
    | EscalationStep[]
    | number
    | boolean
    | undefined;
};

/**
 * Maps a `modelProviders` provider id to the SDK protocol that should route its
 * requests. The value is an {@link AuthType} string (e.g. `openai`, `gemini`,
 * `anthropic`). Lets a custom provider id (e.g. `idealab`) declare which built-in
 * protocol it speaks, decoupling provider identity from SDK routing without
 * changing the `modelProviders` array shape (so older versions stay compatible).
 */
export type ProviderProtocolConfig = {
  [providerId: string]: string;
};

/** Global escalation chain configuration */
export interface EscalationChainConfig {
  /** Ordered list of fallback steps */
  chain: EscalationStep[];
  /** Maximum number of escalation steps per request (default: all) */
  maxSteps?: number;
  /** Whether to restore the original model after successful escalation (default: true) */
  restoreOriginal?: boolean;
}

/**
 * Resolved model config with all defaults applied
 */
export interface ResolvedModelConfig extends ModelConfig {
  /** AuthType this model belongs to (always present from map key) */
  authType: AuthType;
  /** Display name (always present, defaults to id) */
  name: string;
  /** Environment variable name to read API key from (optional, provider-specific) */
  envKey?: string;
  /** API base URL (always present, has default per authType) */
  baseUrl: string;
  /** Exact optional baseUrl used in the registry key, before defaults. */
  registryBaseUrl?: string;
  /** Generation config (always present, merged with defaults) */
  generationConfig: ModelGenerationConfig;
  /** Capabilities (always present, defaults to {}) */
  capabilities: ModelCapabilities;
}

/**
 * Model info for UI display
 */
export interface AvailableModel {
  id: string;
  label: string;
  description?: string;
  capabilities?: ModelCapabilities;
  authType: AuthType;
  isVision?: boolean;
  contextWindowSize?: number;
  modalities?: InputModalities;
  baseUrl?: string;
  /** Exact optional baseUrl used in the model registry key, before defaults. */
  registryBaseUrl?: string;
  envKey?: string;

  /** When true, this model only appears in the fast model selector */
  fastOnly?: boolean;
  /** When true, this model only appears in the voice model selector */
  voiceOnly?: boolean;

  /** Whether this is a runtime model (not from modelProviders) */
  isRuntimeModel?: boolean;

  /** Runtime model snapshot ID (if isRuntimeModel is true) */
  runtimeSnapshotId?: string;
}

/**
 * Metadata for model switch operations
 */
export interface ModelSwitchMetadata {
  /** Reason for the switch */
  reason?: string;
  /** Additional context */
  context?: string;
}

/**
 * Runtime model snapshot - captures complete model configuration from non-modelProviders sources
 */
export interface RuntimeModelSnapshot {
  /** Snapshot unique identifier */
  id: string;

  /** Associated AuthType */
  authType: AuthType;

  /** Model ID */
  modelId: string;

  /** API Key (may come from env/cli/manual input) */
  apiKey?: string;

  /** Base URL (may come from env/cli/settings/credentials) */
  baseUrl?: string;

  /** Environment variable name (if apiKey comes from env) */
  apiKeyEnvKey?: string;

  /** Generation config (sampling parameters, etc.) */
  generationConfig?: ModelGenerationConfig;

  /** Configuration source tracking */
  sources: ConfigSources;

  /** Snapshot creation timestamp */
  createdAt: number;
}
