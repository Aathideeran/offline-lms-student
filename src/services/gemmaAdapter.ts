/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GemmaRuntimeConfig,
  RetrievedCitation,
  RuntimeProbeResult,
} from '../types/lms';
import {
  buildExtractiveGroundedResponse,
  buildGroundedTutorPrompt,
} from '../utils/ragEngine';

export const DEFAULT_GEMMA_CONFIG: GemmaRuntimeConfig = {
  backendId: 'ollama_local',
  endpointUrl: 'http://127.0.0.1:11434',
  modelTag: 'gemma4:e4b',
  temperature: 0.2,
  maxTokens: 512,
};

export interface LocalAIInferenceAdapter {
  probeRuntime(config: GemmaRuntimeConfig): Promise<RuntimeProbeResult>;
  generateGroundedResponse(params: {
    query: string;
    citations: RetrievedCitation[];
    config: GemmaRuntimeConfig;
  }): Promise<{
    content: string;
    groundingType: 'document_grounded' | 'no_matching_passages';
    inferenceMode: 'local_gemma4_runtime' | 'local_extractive_rag_fallback';
    runtimeModelTag?: string;
    runtimeError?: string;
  }>;
}

/**
 * Modular Local Gemma Inference Adapter for Windows & Android.
 *
 * ARCHITECTURAL & PRIVACY GUARANTEES:
 * 1. Never substitutes a cloud AI API (such as Gemini Cloud) for local Gemma inference.
 * 2. Never automatically downloads a multi-gigabyte model without explicit user action in their terminal.
 * 3. Inspects `/api/tags` (Ollama) or `/v1/models` (llama.cpp / LiteRT) to verify both daemon connectivity
 *    AND whether the requested Gemma model tag is installed locally.
 * 4. Wraps all retrieved document chunks inside `<untrusted_course_reference_data>` via `buildGroundedTutorPrompt`
 *    so untrusted course files cannot override the tutor's system instructions.
 * 5. Handles missing models, HTTP errors, and unreachable daemons gracefully while keeping local document
 *    search and citation evidence fully functional.
 */
export class Gemma4LocalAdapter implements LocalAIInferenceAdapter {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchFn?: typeof fetch) {
    this.fetchImpl = fetchFn ?? ((...args) => globalThis.fetch(...args));
  }

  async probeRuntime(config: GemmaRuntimeConfig): Promise<RuntimeProbeResult> {
    const start = performance.now();
    const checkedAt = new Date().toISOString();
    const baseUrl = config.endpointUrl.replace(/\/+$/, '');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);

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
          statusMessage: `Local runtime endpoint responded with HTTP ${response.status}. Verify that your local ${config.backendId} server is running.`,
          checkedAt,
        };
      }

      let availableModels: string[] = [];
      try {
        const payload = (await response.json()) as {
          models?: { name?: string; model?: string }[];
          data?: { id?: string }[];
        };
        if (Array.isArray(payload.models)) {
          availableModels = payload.models
            .map((m) => m.name || m.model || '')
            .filter(Boolean);
        } else if (Array.isArray(payload.data)) {
          availableModels = payload.data.map((m) => m.id || '').filter(Boolean);
        }
      } catch {
        // Non-JSON or empty model list; treat as reachable with unknown model list
      }

      const requestedNormalized = config.modelTag.trim().toLowerCase();
      const requestedPrefix = requestedNormalized.split(':')[0];
      const modelInstalled =
        availableModels.length === 0
          ? true
          : availableModels.some((m) => {
              const lower = m.toLowerCase();
              return (
                lower === requestedNormalized ||
                lower.startsWith(`${requestedNormalized}:`) ||
                lower.includes(requestedPrefix)
              );
            });

      if (!modelInstalled) {
        return {
          reachable: true,
          modelInstalled: false,
          availableModels,
          backendId: config.backendId,
          endpointUrl: config.endpointUrl,
          modelTag: config.modelTag,
          latencyMs,
          statusMessage: `Local ${config.backendId} daemon is reachable (${latencyMs} ms), but model "${config.modelTag}" is not installed. Installed models: ${availableModels.join(', ') || 'none'}. Run "ollama pull ${config.modelTag}" in your terminal if you wish to install it.`,
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
        statusMessage: `Connected to local ${config.backendId} runtime (${config.modelTag} verified available) in ${latencyMs} ms.`,
        checkedAt,
      };
    } catch {
      return {
        reachable: false,
        modelInstalled: false,
        availableModels: [],
        backendId: config.backendId,
        endpointUrl: config.endpointUrl,
        modelTag: config.modelTag,
        latencyMs: null,
        statusMessage: `Local Gemma runtime at ${config.endpointUrl} is not currently running or reachable. Using verified local document search and extractive citations only (no cloud AI calls).`,
        checkedAt,
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

    const baseUrl = config.endpointUrl.replace(/\/+$/, '');
    const promptBundle = buildGroundedTutorPrompt({
      query: trimmedQuery,
      citations,
      maxContextChars: 3200,
    });

    if (skipRuntimeCallIfUnverified) {
      const unverifiedNotice = `Local Gemma runtime at ${config.endpointUrl} (${config.modelTag}) is not currently connected. Showing verified local document passages from IndexedDB. Start your local Gemma runtime and click "Verify Local Runtime" to enable generative explanations.`;
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
