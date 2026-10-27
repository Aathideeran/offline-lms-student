/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DiagnosticFailureReason,
  GemmaRuntimeConfig,
  InferenceVerificationResult,
  RetrievedCitation,
  RuntimeBackendId,
  RuntimeProbeResult,
} from '../types/lms';
import {
  buildExtractiveGroundedResponse,
  buildGroundedTutorPrompt,
} from '../utils/ragEngine';

const CONFIG_STORAGE_KEY = 'siet_lms_local_ai_config_v1';

function getEnvString(key: string, fallback: string): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const val = metaEnv?.[key];
    return val && val.trim().length > 0 ? val.trim() : fallback;
  } catch {
    return fallback;
  }
}

export const DEFAULT_GEMMA_CONFIG: GemmaRuntimeConfig = {
  backendId: (getEnvString('VITE_LOCAL_AI_BACKEND', 'ollama_local') as RuntimeBackendId) || 'ollama_local',
  endpointUrl: getEnvString('VITE_LOCAL_AI_BASE_URL', 'http://127.0.0.1:11434'),
  modelTag: getEnvString('VITE_LOCAL_AI_MODEL', 'gemma4:e4b'),
  temperature: 0.2,
  maxTokens: 512,
};

export function loadSavedGemmaConfig(): GemmaRuntimeConfig {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_GEMMA_CONFIG;
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_GEMMA_CONFIG;
    const parsed = JSON.parse(raw) as Partial<GemmaRuntimeConfig>;
    return {
      backendId:
        parsed.backendId === 'ollama_local' || parsed.backendId === 'llama_cpp_local'
          ? parsed.backendId
          : DEFAULT_GEMMA_CONFIG.backendId,
      endpointUrl:
        typeof parsed.endpointUrl === 'string' && parsed.endpointUrl.trim().length > 0
          ? parsed.endpointUrl.trim()
          : DEFAULT_GEMMA_CONFIG.endpointUrl,
      modelTag:
        typeof parsed.modelTag === 'string' && parsed.modelTag.trim().length > 0
          ? parsed.modelTag.trim()
          : DEFAULT_GEMMA_CONFIG.modelTag,
      temperature:
        typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_GEMMA_CONFIG.temperature,
      maxTokens:
        typeof parsed.maxTokens === 'number' ? parsed.maxTokens : DEFAULT_GEMMA_CONFIG.maxTokens,
    };
  } catch {
    return DEFAULT_GEMMA_CONFIG;
  }
}

export function saveGemmaConfig(config: GemmaRuntimeConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function getBrowserOriginContext(targetEndpointUrl: string): {
  executionOrigin: string;
  isHttpsCloudPreview: boolean;
  isTargetingLoopback: boolean;
} {
  let executionOrigin = 'http://localhost:3000';
  let isHttps = false;
  let isLocalOrigin = true;

  if (typeof window !== 'undefined' && window.location) {
    executionOrigin = window.location.origin;
    isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname;
    isLocalOrigin = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  const isTargetingLoopback =
    /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/i.test(targetEndpointUrl.trim());

  return {
    executionOrigin,
    isHttpsCloudPreview: isHttps && !isLocalOrigin,
    isTargetingLoopback,
  };
}

/**
 * Verifies whether the configured model name matches an installed model in the runtime.
 * Supports exact tag matches (e.g. `gemma4:e4b` === `gemma4:e4b`) and default `:latest` tags
 * (e.g. `gemma4` matches `gemma4:latest`), without falsely matching a different model variant.
 */
export function doesModelTagMatch(configuredTag: string, installedModels: string[]): boolean {
  const target = configuredTag.trim().toLowerCase();
  if (!target) return false;

  return installedModels.some((installed) => {
    const candidate = installed.trim().toLowerCase();
    if (candidate === target) return true;
    if (candidate === `${target}:latest`) return true;
    if (target.endsWith(':latest') && candidate === target.slice(0, -7)) return true;
    return false;
  });
}

export interface LocalAIInferenceAdapter {
  probeRuntime(config: GemmaRuntimeConfig): Promise<RuntimeProbeResult>;
  verifyActualInference(config: GemmaRuntimeConfig): Promise<InferenceVerificationResult>;
  generateGroundedResponse(params: {
    query: string;
    citations: RetrievedCitation[];
    config: GemmaRuntimeConfig;
    skipRuntimeCallIfUnverified?: boolean;
  }): Promise<{
    content: string;
    groundingType: 'document_grounded' | 'no_matching_passages';
    inferenceMode: 'local_gemma4_runtime' | 'local_extractive_rag_fallback';
    runtimeModelTag?: string;
    runtimeError?: string;
  }>;
}

/**
 * Modular Local Gemma Inference Adapter for Windows, Linux & Android.
 *
 * ARCHITECTURAL & PRIVACY GUARANTEES:
 * 1. Never substitutes a cloud AI API (such as Gemini Cloud) for local Gemma inference.
 * 2. Never automatically downloads a multi-gigabyte model without explicit user action in their terminal.
 * 3. Strictly validates `/api/tags` (Ollama) or `/v1/models` (llama.cpp / LiteRT) JSON structures
 *    and verifies exact model tag installation (`doesModelTagMatch`).
 * 4. Provides `verifyActualInference` to send a minimal real test prompt to the local runtime
 *    and report `verified: true` ONLY when a genuine model response is received.
 * 5. Wraps all retrieved document chunks inside `<untrusted_course_reference_data>` via `buildGroundedTutorPrompt`
 *    so untrusted course files cannot override the tutor's system instructions.
 */
export class Gemma4LocalAdapter implements LocalAIInferenceAdapter {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchFn?: typeof fetch) {
    this.fetchImpl = fetchFn ?? ((...args) => globalThis.fetch(...args));
  }

  async probeRuntime(config: GemmaRuntimeConfig): Promise<RuntimeProbeResult> {
    const start = performance.now();
    const checkedAt = new Date().toISOString();
    const baseUrl = config.endpointUrl.trim().replace(/\/+$/, '');
    const originCtx = getBrowserOriginContext(baseUrl);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      const probePath =
        config.backendId === 'ollama_local' ? `${baseUrl}/api/tags` : `${baseUrl}/v1/models`;

      const response = await this.fetchImpl(probePath, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        return {
          reachable: false,
          modelInstalled: false,
          availableModels: [],
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          latencyMs,
          failureReason: 'http_error',
          executionOrigin: originCtx.executionOrigin,
          isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
          statusMessage: `Local runtime endpoint (${probePath}) responded with HTTP ${response.status}. Verify that your local ${config.backendId === 'ollama_local' ? 'Ollama' : 'llama.cpp'} server is running.`,
          checkedAt,
        };
      }

      let availableModels: string[] = [];
      let validRuntimeJson = false;
      try {
        const payload = (await response.json()) as {
          models?: { name?: string; model?: string }[];
          data?: { id?: string }[];
        };
        if (config.backendId === 'ollama_local' && Array.isArray(payload?.models)) {
          validRuntimeJson = true;
          availableModels = payload.models
            .map((m) => (m.name || m.model || '').trim())
            .filter(Boolean);
        } else if (config.backendId === 'llama_cpp_local' && Array.isArray(payload?.data)) {
          validRuntimeJson = true;
          availableModels = payload.data.map((m) => (m.id || '').trim()).filter(Boolean);
        } else if (Array.isArray(payload?.models) || Array.isArray(payload?.data)) {
          validRuntimeJson = true;
          const rawList = payload.models ?? payload.data ?? [];
          availableModels = rawList
            .map((m: { name?: string; model?: string; id?: string }) =>
              (m.name || m.model || m.id || '').trim()
            )
            .filter(Boolean);
        }
      } catch {
        validRuntimeJson = false;
      }

      if (!validRuntimeJson) {
        return {
          reachable: false,
          modelInstalled: false,
          availableModels: [],
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          latencyMs,
          failureReason: 'invalid_runtime_json',
          executionOrigin: originCtx.executionOrigin,
          isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
          statusMessage: `Endpoint ${probePath} returned HTTP 200, but did not return valid ${config.backendId === 'ollama_local' ? 'Ollama (/api/tags)' : 'OpenAI (/v1/models)'} JSON. Check that another web server is not occupying this port.`,
          checkedAt,
        };
      }

      if (availableModels.length === 0) {
        return {
          reachable: true,
          modelInstalled: false,
          availableModels: [],
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          latencyMs,
          failureReason: 'no_models_installed',
          executionOrigin: originCtx.executionOrigin,
          isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
          statusMessage: `Local ${config.backendId} server is running at ${config.endpointUrl} (${latencyMs} ms), but 0 models are installed. Run "ollama pull ${config.modelTag}" in your terminal to install the model.`,
          checkedAt,
        };
      }

      const modelInstalled = doesModelTagMatch(config.modelTag, availableModels);

      if (!modelInstalled) {
        return {
          reachable: true,
          modelInstalled: false,
          availableModels,
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          latencyMs,
          failureReason: 'model_tag_mismatch',
          executionOrigin: originCtx.executionOrigin,
          isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
          statusMessage: `Local runtime at ${config.endpointUrl} is reachable (${latencyMs} ms), but configured model "${config.modelTag}" does not match any installed model. Installed models: ${availableModels.join(', ')}. Select an installed model below or run "ollama pull ${config.modelTag}".`,
          checkedAt,
        };
      }

      return {
        reachable: true,
        modelInstalled: true,
        availableModels,
        backendId: config.backendId,
        endpointUrl: config.endpointUrl,
        modelTag: config.modelTag,
        latencyMs,
        failureReason: 'none',
        executionOrigin: originCtx.executionOrigin,
        isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
        statusMessage: `API check passed: ${config.endpointUrl} is reachable (${latencyMs} ms) and model "${config.modelTag}" is installed. Click "Test Model Inference" to verify live token generation.`,
        checkedAt,
      };
    } catch {
      const failureReason: DiagnosticFailureReason =
        originCtx.isHttpsCloudPreview && originCtx.isTargetingLoopback
          ? 'https_preview_loopback_blocked'
          : 'connection_refused_or_cors';

      const diagnosticMsg =
        failureReason === 'https_preview_loopback_blocked'
          ? `Cannot reach ${config.endpointUrl} from cloud preview origin (${originCtx.executionOrigin}). In this hosted preview, 127.0.0.1 refers to your local device, and browser security (HTTPS-to-HTTP Private Network Access / CORS) blocks loopback requests unless Ollama is running with OLLAMA_ORIGINS=* or you run SIET-LMS locally on http://localhost:3000.`
          : `Connection to ${config.endpointUrl} failed from ${originCtx.executionOrigin}. Either no local Ollama/llama.cpp server is listening on ${config.endpointUrl}, or CORS headers are missing (start Ollama with: OLLAMA_ORIGINS=* ollama serve).`;

      return {
        reachable: false,
        modelInstalled: false,
        availableModels: [],
        backendId: config.backendId,
        endpointUrl: config.endpointUrl,
        modelTag: config.modelTag,
        latencyMs: null,
        failureReason,
        executionOrigin: originCtx.executionOrigin,
        isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
        statusMessage: diagnosticMsg,
        checkedAt,
      };
    }
  }

  /**
   * Sends a minimal live test prompt to the configured local runtime and reports `verified: true`
   * ONLY when a genuine non-empty model completion is returned. Never simulates a response.
   */
  async verifyActualInference(config: GemmaRuntimeConfig): Promise<InferenceVerificationResult> {
    const start = performance.now();
    const verifiedAt = new Date().toISOString();
    const baseUrl = config.endpointUrl.trim().replace(/\/+$/, '');
    const testPrompt = 'Reply with the single word READY.';
    const originCtx = getBrowserOriginContext(baseUrl);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      if (config.backendId === 'ollama_local') {
        const res = await this.fetchImpl(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.modelTag,
            prompt: testPrompt,
            stream: false,
            options: {
              temperature: 0,
              num_predict: 16,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Math.round(performance.now() - start);

        if (!res.ok) {
          let errDetail = `HTTP ${res.status}`;
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson?.error) errDetail = errJson.error;
          } catch {
            // ignore non-json error body
          }
          const isMissingModel =
            res.status === 404 || errDetail.toLowerCase().includes('not found');
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: isMissingModel ? 'model_tag_mismatch' : 'http_error',
            errorMessage: `Inference test failed at ${baseUrl}/api/generate (${errDetail}). ${
              isMissingModel
                ? `Model "${config.modelTag}" is not installed in Ollama. Run "ollama pull ${config.modelTag}".`
                : 'Verify that your local Ollama service is healthy.'
            }`,
            verifiedAt,
          };
        }

        const data = (await res.json()) as { response?: string; error?: string };
        if (data?.error) {
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: 'inference_error',
            errorMessage: `Local Ollama runtime returned an error: ${data.error}`,
            verifiedAt,
          };
        }

        const reply = (data?.response ?? '').trim();
        if (!reply) {
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: 'inference_error',
            errorMessage: `Local Ollama runtime responded with HTTP 200, but returned an empty completion string for model "${config.modelTag}".`,
            verifiedAt,
          };
        }

        return {
          verified: true,
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          testPrompt,
          rawResponseText: reply,
          latencyMs,
          failureReason: 'none',
          verifiedAt,
        };
      } else {
        const res = await this.fetchImpl(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.modelTag,
            messages: [{ role: 'user', content: testPrompt }],
            temperature: 0,
            max_tokens: 16,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Math.round(performance.now() - start);

        if (!res.ok) {
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: 'http_error',
            errorMessage: `Inference test failed at ${baseUrl}/v1/chat/completions with HTTP ${res.status}.`,
            verifiedAt,
          };
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          error?: { message?: string };
        };
        if (data?.error?.message) {
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: 'inference_error',
            errorMessage: `Local runtime error: ${data.error.message}`,
            verifiedAt,
          };
        }

        const reply = (data?.choices?.[0]?.message?.content ?? '').trim();
        if (!reply) {
          return {
            verified: false,
            backendId: config.backendId,
            endpointUrl: config.endpointUrl,
            modelTag: config.modelTag,
            testPrompt,
            rawResponseText: null,
            latencyMs,
            failureReason: 'inference_error',
            errorMessage: `Endpoint ${baseUrl}/v1/chat/completions returned HTTP 200 without valid OpenAI choices[].message.content JSON.`,
            verifiedAt,
          };
        }

        return {
          verified: true,
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          testPrompt,
          rawResponseText: reply,
          latencyMs,
          failureReason: 'none',
          verifiedAt,
        };
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network error';
      const isHttpsLoopback =
        originCtx.isHttpsCloudPreview && originCtx.isTargetingLoopback;

      return {
        verified: false,
        backendId: config.backendId,
        endpointUrl: config.endpointUrl,
        modelTag: config.modelTag,
        testPrompt,
        rawResponseText: null,
        latencyMs: null,
        failureReason: isHttpsLoopback
          ? 'https_preview_loopback_blocked'
          : 'connection_refused_or_cors',
        errorMessage: isHttpsLoopback
          ? `Live inference request to ${config.endpointUrl} failed (${reason}) from HTTPS preview origin ${originCtx.executionOrigin}. Run SIET-LMS locally (http://localhost:3000) alongside Ollama (OLLAMA_ORIGINS=* ollama serve), or configure OLLAMA_ORIGINS=* and allow loopback access in your browser.`
          : `Live inference request to ${config.endpointUrl} failed (${reason}). Confirm that your local model server is running and CORS is enabled (OLLAMA_ORIGINS=* ollama serve).`,
        verifiedAt,
      };
    }
  }

  async generateGroundedResponse(params: {
    query: string;
    citations: RetrievedCitation[];
    config: GemmaRuntimeConfig;
    skipRuntimeCallIfUnverified?: boolean;
  }): Promise<{
    content: string;
    groundingType: 'document_grounded' | 'no_matching_passages';
    inferenceMode: 'local_gemma4_runtime' | 'local_extractive_rag_fallback';
    runtimeModelTag?: string;
    runtimeError?: string;
  }> {
    const { query, citations, config, skipRuntimeCallIfUnverified = false } = params;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return {
        content: 'Please enter a non-empty study question before submitting.',
        groundingType: 'no_matching_passages',
        inferenceMode: 'local_extractive_rag_fallback',
        runtimeError: 'Question cannot be empty.',
      };
    }

    const baseUrl = config.endpointUrl.trim().replace(/\/+$/, '');
    const promptBundle = buildGroundedTutorPrompt({
      query: trimmedQuery,
      citations,
      maxContextChars: 3200,
    });

    if (skipRuntimeCallIfUnverified) {
      const unverifiedNotice = `Local Gemma runtime at ${config.endpointUrl} (${config.modelTag}) is not currently connected or verified. Showing verified local document passages from IndexedDB (not generated by Gemma). Start your local Gemma runtime and click "Test Model Inference" to enable live model generation.`;
      const fallback = buildExtractiveGroundedResponse(
        trimmedQuery,
        promptBundle.includedCitations,
        unverifiedNotice
      );
      return {
        content: fallback.content,
        groundingType: fallback.groundingType,
        inferenceMode: 'local_extractive_rag_fallback',
        runtimeError: unverifiedNotice,
      };
    }

    let capturedRuntimeError: string | undefined;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      if (config.backendId === 'ollama_local') {
        const res = await this.fetchImpl(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.modelTag,
            system: promptBundle.systemPrompt,
            prompt: promptBundle.userPrompt,
            stream: false,
            options: {
              temperature: config.temperature,
              num_predict: config.maxTokens,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          let errDetail = `HTTP ${res.status}`;
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson.error) errDetail = errJson.error;
          } catch {
            // ignore JSON parse failure on error body
          }
          capturedRuntimeError = `Local Ollama runtime returned an error for model "${config.modelTag}": ${errDetail}. Showing verified local document evidence below.`;
        } else {
          const data = (await res.json()) as { response?: string; error?: string };
          if (data.error) {
            capturedRuntimeError = `Local Ollama model error: ${data.error}`;
          } else if (data.response && data.response.trim().length > 0) {
            return {
              content: data.response.trim(),
              groundingType:
                promptBundle.includedCitations.length > 0
                  ? 'document_grounded'
                  : 'no_matching_passages',
              inferenceMode: 'local_gemma4_runtime',
              runtimeModelTag: config.modelTag,
            };
          }
        }
      } else {
        // OpenAI-compatible local server (llama.cpp / LiteRT / vLLM)
        const res = await this.fetchImpl(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.modelTag,
            messages: [
              { role: 'system', content: promptBundle.systemPrompt },
              { role: 'user', content: promptBundle.userPrompt },
            ],
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          capturedRuntimeError = `Local llama.cpp / OpenAI-compatible server at ${baseUrl} responded with HTTP ${res.status}. Showing verified local document evidence below.`;
        } else {
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
            error?: { message?: string };
          };
          if (data.error?.message) {
            capturedRuntimeError = `Local runtime error: ${data.error.message}`;
          } else {
            const reply = data.choices?.[0]?.message?.content;
            if (reply && reply.trim().length > 0) {
              return {
                content: reply.trim(),
                groundingType:
                  promptBundle.includedCitations.length > 0
                    ? 'document_grounded'
                    : 'no_matching_passages',
                inferenceMode: 'local_gemma4_runtime',
                runtimeModelTag: config.modelTag,
              };
            }
          }
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Connection refused or timed out';
      capturedRuntimeError = `Local Gemma runtime (${config.endpointUrl}) is unavailable (${reason}). Showing verified local document passages without generative model synthesis.`;
    }

    const fallback = buildExtractiveGroundedResponse(
      trimmedQuery,
      promptBundle.includedCitations,
      capturedRuntimeError
    );
    return {
      content: fallback.content,
      groundingType: fallback.groundingType,
      inferenceMode: 'local_extractive_rag_fallback',
      runtimeError: capturedRuntimeError,
    };
  }
}

export const gemma4Adapter = new Gemma4LocalAdapter();
