/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  Course,
  GemmaRuntimeConfig,
  InferenceVerificationResult,
  LocalDocumentChunk,
  RetrievedCitation,
  RuntimeProbeResult,
} from '../types/lms';
import {
  gemma4Adapter,
  getBrowserOriginContext,
  loadSavedGemmaConfig,
  saveGemmaConfig,
} from '../services/gemmaAdapter';
import {
  buildGroundedTutorPrompt,
  retrieveRelevantChunks,
} from '../utils/ragEngine';
import { FormattedText } from './FormattedText';

interface GemmaTutorViewProps {
  courses: Course[];
  chunks: LocalDocumentChunk[];
  messages: ChatMessage[];
  initialPrompt?: string;
  initialCourseId?: string;
  onAppendMessages: (msgs: ChatMessage[]) => Promise<void>;
  onClearMessages: () => Promise<void>;
}

export const GemmaTutorView: React.FC<GemmaTutorViewProps> = ({
  courses,
  chunks,
  messages,
  initialPrompt = '',
  initialCourseId = 'all',
  onAppendMessages,
  onClearMessages,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [query, setQuery] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<GemmaRuntimeConfig>(() =>
    loadSavedGemmaConfig()
  );

  const [probeStatus, setProbeStatus] = useState<RuntimeProbeResult>(() => {
    const initialCfg = loadSavedGemmaConfig();
    const originCtx = getBrowserOriginContext(initialCfg.endpointUrl);
    return {
      reachable: false,
      modelInstalled: false,
      availableModels: [],
      backendId: initialCfg.backendId,
      endpointUrl: initialCfg.endpointUrl,
      modelTag: initialCfg.modelTag,
      latencyMs: null,
      failureReason: 'unprobed',
      executionOrigin: originCtx.executionOrigin,
      isHttpsCloudPreview: originCtx.isHttpsCloudPreview,
      statusMessage: originCtx.isHttpsCloudPreview
        ? `Running in remote HTTPS preview (${originCtx.executionOrigin}). Here ${initialCfg.endpointUrl} refers to your local computer's loopback interface. Click "Check Runtime & Models" or "Test Model Inference" to probe your local Ollama/llama.cpp server, or open "Adapter & Setup Guide" for local deployment instructions.`
        : `Local Gemma runtime (${initialCfg.modelTag} @ ${initialCfg.endpointUrl}) has not been verified in this session yet. Click "Check Runtime & Models" or "Test Model Inference" to verify live model availability.`,
      checkedAt: new Date().toISOString(),
    };
  });

  const [inferenceVerification, setInferenceVerification] =
    useState<InferenceVerificationResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [isTestingInference, setIsTestingInference] = useState(false);
  const [pwaCacheStatus, setPwaCacheStatus] = useState<{
    swSupported: boolean;
    swControlled: boolean;
    cacheNamesCount: number;
  }>({
    swSupported: false,
    swControlled: false,
    cacheNamesCount: 0,
  });

  const [inspectedCitation, setInspectedCitation] = useState<RetrievedCitation | null>(null);
  const [inspectedPromptPreview, setInspectedPromptPreview] = useState<string | null>(null);

  const isModelReady = Boolean(probeStatus?.reachable && probeStatus?.modelInstalled === true);
  const isInferenceVerified = Boolean(inferenceVerification?.verified);

  useEffect(() => {
    let mounted = true;
    async function checkPwaState() {
      const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
      const swControlled = swSupported && Boolean(navigator.serviceWorker.controller);
      let cacheNamesCount = 0;
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          const keys = await window.caches.keys();
          cacheNamesCount = keys.length;
        }
      } catch {
        cacheNamesCount = 0;
      }
      if (mounted) {
        setPwaCacheStatus({ swSupported, swControlled, cacheNamesCount });
      }
    }
    checkPwaState();
    return () => {
      mounted = false;
    };
  }, []);

  const updateConfig = (next: GemmaRuntimeConfig) => {
    setRuntimeConfig(next);
    saveGemmaConfig(next);
    setInferenceVerification(null);
  };

  const runProbe = async (cfg: GemmaRuntimeConfig) => {
    setIsProbing(true);
    setErrorBanner(null);
    const result = await gemma4Adapter.probeRuntime(cfg);
    setProbeStatus(result);
    setIsProbing(false);
    return result;
  };

  const runInferenceVerification = async (cfg: GemmaRuntimeConfig) => {
    setIsTestingInference(true);
    setErrorBanner(null);
    const probeRes = await gemma4Adapter.probeRuntime(cfg);
    setProbeStatus(probeRes);
    const verifyRes = await gemma4Adapter.verifyActualInference(cfg);
    setInferenceVerification(verifyRes);
    setIsTestingInference(false);
  };

  useEffect(() => {
    if (initialPrompt) {
      setQuery(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setErrorBanner('Please enter a study question before clicking Send.');
      return;
    }

    setErrorBanner(null);
    setIsGenerating(true);
    setQuery('');

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      conversationId: 'default-local-conv',
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const citations = retrieveRelevantChunks(trimmed, chunks, {
      courseIdFilter: selectedCourseId,
      topK: 3,
    });

    const shouldSkipNetwork =
      probeStatus.failureReason === 'unprobed' || !isModelReady;

    const response = await gemma4Adapter.generateGroundedResponse({
      query: trimmed,
      citations,
      config: runtimeConfig,
      skipRuntimeCallIfUnverified: shouldSkipNetwork,
    });

    if (response.runtimeError) {
      setErrorBanner(response.runtimeError);
    }

    const assistantMsg: ChatMessage = {
      id: `msg-assistant-${Date.now() + 1}`,
      conversationId: 'default-local-conv',
      role: 'assistant',
      content: response.content,
      createdAt: new Date().toISOString(),
      citations,
      groundingType: response.groundingType,
      inferenceMode: response.inferenceMode,
      runtimeModelTag: response.runtimeModelTag,
      runtimeError: response.runtimeError,
    };

    await onAppendMessages([userMsg, assistantMsg]);
    setIsGenerating(false);
  };

  const handleOpenCitationInspector = (cit: RetrievedCitation, questionContext?: string) => {
    setInspectedCitation(cit);
    if (questionContext) {
      const bundle = buildGroundedTutorPrompt({
        query: questionContext,
        citations: [cit],
        maxContextChars: 3200,
      });
      setInspectedPromptPreview(`${bundle.systemPrompt}\n\n${bundle.userPrompt}`);
    } else {
      setInspectedPromptPreview(null);
    }
  };

  const quickQuestions = [
    'How are Weak Entities and Derived Attributes represented in ER diagrams?',
    'Explain the difference between Super Key, Candidate Key, and Primary Key with the 2^(n-k) formula.',
    'What is the difference between DELETE and TRUNCATE in SQL, and WHERE vs HAVING?',
    'Show the Time & Work and Train speed formulas for the 25ENS311 Quants Retest.',
  ];

  return (
    <main className="w-full max-w-[960px] mx-auto px-4 sm:px-6 py-7">
      {/* Header & Local Runtime Verification Panel */}
      <div className="bg-white border border-[#dee2e6] rounded-[12px] p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#015303]" />
              <h1 className="text-lg font-bold text-[#1d2125]">
                Gemma Local Offline AI Study Tutor & Document Q&A
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Answers student questions using locally stored SIET-LMS course materials (
              <span className="font-mono tabular-nums font-semibold">{chunks.length}</span> indexed
              chunks). Never uploads questions or documents to cloud AI APIs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => runProbe(runtimeConfig)}
              disabled={isProbing || isTestingInference}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
              <span>Check Runtime &amp; Models</span>
            </button>

            <button
              type="button"
              onClick={() => runInferenceVerification(runtimeConfig)}
              disabled={isTestingInference || isProbing}
              className="px-3 py-1.5 rounded-lg bg-[#015303] hover:bg-[#0f6b3e] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {isTestingInference ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isTestingInference ? 'Testing Model...' : 'Test Model Inference'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigDrawer((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Adapter &amp; Setup Guide</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setErrorBanner(null);
                setInspectedCitation(null);
                await onClearMessages();
              }}
              disabled={messages.length === 0}
              aria-label="Clear Chat"
              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* 3-Layer Offline & Runtime Capability Matrix */}
        <div
          aria-label="Offline and Runtime Capability Matrix"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs"
        >
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <WifiOff className="w-3.5 h-3.5 text-[#0f6b3e]" />
              <span>1. App Shell Offline Cache</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-700">
              {pwaCacheStatus.swSupported
                ? `Service Worker: Supported (${pwaCacheStatus.cacheNamesCount} cache store${pwaCacheStatus.cacheNamesCount === 1 ? '' : 's'})`
                : 'Service Worker: Unavailable in this browser'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Caches UI assets only (does not bundle LLM weights)
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
              <HardDrive className="w-3.5 h-3.5 text-[#0f6b3e]" />
              <span>2. Local Document Search</span>
            </div>
            <div className="mt-1 font-mono tabular-nums text-[11px] text-emerald-900 font-semibold">
              ● Verified Active ({chunks.length} Indexed Chunks)
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              100% Local IndexedDB BM25 retrieval (Works Offline)
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              isInferenceVerified
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-[#015303]" />
              <span>3. Local Gemma Inference</span>
            </div>
            <div className="mt-1 font-mono text-[11px] font-semibold">
              {isInferenceVerified
                ? `● Verified Live (${inferenceVerification?.modelTag} · ${inferenceVerification?.latencyMs} ms)`
                : isModelReady
                ? `◐ API Reachable (${runtimeConfig.modelTag}) — Click "Test Model Inference"`
                : `▲ Unavailable (${runtimeConfig.endpointUrl})`}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {isInferenceVerified
                ? 'Real completion verified from local runtime'
                : 'Requires local Ollama / llama.cpp process on host'}
            </div>
          </div>
        </div>

        {/* Detailed Local Model Status Indicator */}
        {probeStatus && (
          <div
            role="status"
            aria-label="Local Model Status Indicator"
            className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${
              isModelReady
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-slate-800'
            }`}
          >
            <div className="font-semibold flex flex-wrap items-center justify-between gap-2">
              <span>
                {isInferenceVerified
                  ? `● Real Local Gemma Inference Verified (${runtimeConfig.modelTag} @ ${runtimeConfig.endpointUrl})`
                  : isModelReady
                  ? `● Local Gemma Model Installed (${probeStatus.modelTag} @ ${probeStatus.endpointUrl}) — Ready for Inference Verification`
                  : probeStatus.reachable && probeStatus.modelInstalled === false
                  ? `▲ Local Runtime Reachable at ${probeStatus.endpointUrl} — Model "${probeStatus.modelTag}" Not Installed`
                  : `▲ Local Gemma Model Unavailable (${probeStatus.endpointUrl}) — Using Verified Local Document Evidence Mode`}
              </span>
              <span className="font-mono text-[11px] text-slate-600 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-[#0f6b3e]" />
                No Cloud AI Fallback
              </span>
            </div>
            <p className="mt-1 text-slate-700">{probeStatus.statusMessage}</p>

            {probeStatus.reachable &&
              probeStatus.availableModels &&
              probeStatus.availableModels.length > 0 &&
              !probeStatus.modelInstalled && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-800">
                    Switch to an installed local model:
                  </span>
                  {probeStatus.availableModels.map((installedName) => (
                    <button
                      key={installedName}
                      type="button"
                      onClick={() => {
                        const next = { ...runtimeConfig, modelTag: installedName };
                        updateConfig(next);
                        runProbe(next);
                      }}
                      className="px-2.5 py-1 rounded bg-white border border-[#0f6b3e] text-[#0f6b3e] hover:bg-emerald-50 font-mono text-[11px] font-semibold cursor-pointer"
                    >
                      Use {installedName}
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Live Model Inference Verification Result Panel */}
        {inferenceVerification && (
          <div
            role="region"
            aria-label="Model Inference Verification Result"
            className={`mt-3 p-3.5 rounded-lg border text-xs space-y-1.5 ${
              inferenceVerification.verified
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold flex items-center gap-1.5">
                {inferenceVerification.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                )}
                <span>
                  {inferenceVerification.verified
                    ? `Live Inference Verified (${inferenceVerification.modelTag} responded in ${inferenceVerification.latencyMs} ms)`
                    : `Live Inference Verification Failed (${inferenceVerification.endpointUrl})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInferenceVerification(null)}
                aria-label="Close inference test result"
                className="p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="font-mono text-[11px]">
              Test Prompt Sent: &ldquo;{inferenceVerification.testPrompt}&rdquo;
            </div>

            {inferenceVerification.verified ? (
              <div className="p-2 rounded bg-white border border-emerald-200 font-mono text-[11px] text-slate-900">
                Real Model Response: &ldquo;{inferenceVerification.rawResponseText}&rdquo;
              </div>
            ) : (
              <div className="text-[11.5px] leading-relaxed">
                <strong>Diagnostic Error:</strong> {inferenceVerification.errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Windows / Linux / Android Native Runtime Adapter & Diagnostic Setup Guide */}
        {showConfigDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="gemma-backend-select"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Local Runtime Adapter
                </label>
                <select
                  id="gemma-backend-select"
                  value={runtimeConfig.backendId}
                  onChange={(e) => {
                    const backendId = e.target.value as GemmaRuntimeConfig['backendId'];
                    const defaultUrl =
                      backendId === 'ollama_local'
                        ? 'http://127.0.0.1:11434'
                        : 'http://127.0.0.1:8080';
                    updateConfig({
                      ...runtimeConfig,
                      backendId,
                      endpointUrl: defaultUrl,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ollama_local">Ollama Local Daemon (Windows / Linux)</option>
                  <option value="llama_cpp_local">
                    llama.cpp / LiteRT OpenAI Server (Windows / Android)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="gemma-endpoint-input"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Local Endpoint URL
                </label>
                <input
                  id="gemma-endpoint-input"
                  type="url"
                  value={runtimeConfig.endpointUrl}
                  onChange={(e) =>
                    updateConfig({ ...runtimeConfig, endpointUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="gemma-model-input"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Configured Model Tag
                </label>
                <input
                  id="gemma-model-input"
                  type="text"
                  value={runtimeConfig.modelTag}
                  onChange={(e) =>
                    updateConfig({ ...runtimeConfig, modelTag: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 text-slate-700">
              <div className="font-bold text-slate-900">
                Why 127.0.0.1:11434 Shows Unavailable in Cloud Preview &amp; How to Run Locally:
              </div>
              <p className="text-[11.5px] leading-relaxed">
                <strong>1. Environment Diagnosis:</strong> When viewing the hosted preview URL (
                <code className="px-1 py-0.5 bg-white border rounded font-mono">
                  https://*.run.app
                </code>
                ), the cloud container itself does not have Ollama or multi-gigabyte Gemma model
                weights installed, and browsers restrict HTTPS web pages from connecting to
                unencrypted <code className="px-1 py-0.5 bg-white border rounded font-mono">http://127.0.0.1:11434</code>{' '}
                unless CORS and Private Network Access are explicitly configured on your machine.
              </p>
              <div className="text-[11.5px] space-y-1">
                <strong>2. Recommended Local Deployment Setup (Windows / Linux):</strong>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>
                    Install Ollama (<code className="font-mono">https://ollama.com</code>) and pull
                    your model:{' '}
                    <code className="px-1.5 py-0.5 bg-white border rounded font-mono">
                      ollama pull {runtimeConfig.modelTag}
                    </code>{' '}
                    (or <code className="font-mono">ollama pull gemma3:4b</code>).
                  </li>
                  <li>
                    Start Ollama on localhost with browser CORS enabled (never expose port 11434 to
                    the public internet):{' '}
                    <code className="px-1.5 py-0.5 bg-white border rounded font-mono">
                      OLLAMA_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 ollama serve
                    </code>
                  </li>
                  <li>
                    Run SIET-LMS Offline locally on your machine:{' '}
                    <code className="px-1.5 py-0.5 bg-white border rounded font-mono">
                      npm install &amp;&amp; npm run dev
                    </code>{' '}
                    and open <code className="font-mono">http://localhost:3000</code>.
                  </li>
                  <li>
                    Click <strong>Check Runtime &amp; Models</strong> and{' '}
                    <strong>Test Model Inference</strong> above to verify a real model completion.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Course Scope Filter & Prompt Starters */}
      <div className="bg-white border border-[#dee2e6] rounded-[12px] p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0f6b3e]" />
            <label htmlFor="rag-course-filter" className="text-xs font-bold text-slate-800">
              Retrieval Scope (Local IndexedDB Document Chunks):
            </label>
            <select
              id="rag-course-filter"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
            >
              <option value="all">All SIET-LMS Courses ({chunks.length} passages)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            Untrusted Reference Sandboxing: Active (&lt;untrusted_course_reference_data&gt;)
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11.5px] font-medium text-slate-500">
            Sample Course Questions (Click to populate question input):
          </div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setErrorBanner(null);
                  setQuery(q);
                }}
                className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#0f6b3e]/5 hover:border-[#0f6b3e]/40 text-slate-700 transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error / Runtime Notice Area */}
      {errorBanner && (
        <div
          role="alert"
          aria-label="Tutor Error or Runtime Notice"
          className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Tutor Notice: </span>
              <span>{errorBanner}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss notice"
            className="p-1 rounded hover:bg-amber-200/60 text-amber-900 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clickable Source Reference Inspector Drawer */}
      {inspectedCitation && (
        <section
          aria-label="Source Reference Inspector"
          className="mb-5 p-4 rounded-xl border-2 border-[#0f6b3e] bg-[#f8fdf9] space-y-3 text-xs"
        >
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#cce6d4]">
            <div>
              <div className="text-[11px] font-semibold text-[#0f6b3e] uppercase tracking-wider">
                Verified Local Source Reference Inspector
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                {inspectedCitation.documentTitle} → {inspectedCitation.heading}
              </h2>
              <div className="font-mono tabular-nums text-[11px] text-slate-600 mt-0.5">
                File: {inspectedCitation.fileName ?? 'local_document.md'} · Chunk #
                {(inspectedCitation.chunkIndex ?? 0) + 1}
                {inspectedCitation.charStart !== undefined &&
                inspectedCitation.charEnd !== undefined
                  ? ` (chars ${inspectedCitation.charStart}–${inspectedCitation.charEnd})`
                  : ''}{' '}
                · BM25 Score: {inspectedCitation.score}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInspectedCitation(null);
                setInspectedPromptPreview(null);
              }}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              Close Inspector
            </button>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
            {inspectedCitation.excerpt}
          </div>

          {inspectedPromptPreview && (
            <details className="text-[11px] text-slate-600">
              <summary className="font-semibold text-[#0f6b3e] cursor-pointer">
                View Context-Aware Prompt & Untrusted Reference Sandboxing Sent to Local Gemma
              </summary>
              <pre className="mt-2 p-3 rounded bg-slate-900 text-slate-100 font-mono text-[10.5px] overflow-x-auto whitespace-pre-wrap">
                {inspectedPromptPreview}
              </pre>
            </details>
          )}
        </section>
      )}

      {/* Conversation History & Question Input Box */}
      <div className="bg-white border border-[#dee2e6] rounded-[12px] overflow-hidden flex flex-col">
        <div
          aria-label="Tutor Conversation History"
          className="p-5 space-y-5 min-h-[340px] max-h-[540px] overflow-y-auto"
        >
          {messages.length === 0 && !isGenerating ? (
            <div className="py-12 text-center max-w-md mx-auto">
              <Cpu className="w-8 h-8 text-[#0f6b3e] mx-auto mb-2 opacity-80" />
              <h2 className="text-sm font-bold text-slate-900">
                Ask a Question About Your Offline Course Materials
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your question is matched against locally stored SIET-LMS course chunks using BM25
                ranking. Click any source citation to inspect the exact passage, filename, and chunk
                identifier.
              </p>
            </div>
          ) : (
            messages.map((msg, mIdx) => {
              const precedingUserQuestion =
                msg.role === 'assistant' && mIdx > 0 && messages[mIdx - 1]?.role === 'user'
                  ? messages[mIdx - 1].content
                  : undefined;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#015303] text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-2 pb-1.5 border-b border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-[#0f6b3e]">
                          {msg.inferenceMode === 'local_gemma4_runtime'
                            ? `Gemma Local Runtime Synthesis (${msg.runtimeModelTag})`
                            : 'Verified Local Document Evidence (Extractive Mode)'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {msg.groundingType === 'document_grounded'
                            ? `${msg.citations?.length ?? 0} Source Passage(s) Cited`
                            : '0 Matching Local Passages'}
                        </span>
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <FormattedText text={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    {/* Clickable Source References */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                          Clickable Source References (Click to read full chunk & prompt context):
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {msg.citations.map((cit, cIdx) => (
                            <button
                              key={cit.chunkId}
                              type="button"
                              onClick={() =>
                                handleOpenCitationInspector(cit, precedingUserQuestion)
                              }
                              className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#0f6b3e] hover:bg-emerald-50/40 font-mono tabular-nums text-[11px] text-slate-700 flex items-center justify-between gap-2 transition cursor-pointer"
                            >
                              <span className="truncate">
                                <FileText className="w-3 h-3 inline mr-1.5 text-[#0f6b3e]" />
                                [Source {cIdx + 1}] {cit.fileName ?? 'local_doc.md'} ·{' '}
                                {cit.documentTitle} → {cit.heading}
                              </span>
                              <span className="text-[#0f6b3e] font-semibold shrink-0">
                                Chunk #{(cit.chunkIndex ?? 0) + 1} · BM25: {cit.score}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isGenerating && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-md"
            >
              <Loader2 className="w-4 h-4 text-[#0f6b3e] animate-spin shrink-0" />
              <span>
                Searching local IndexedDB chunks &amp; querying local Gemma runtime...
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleAskSubmit}
          noValidate
          className="p-4 bg-slate-50 border-t border-[#dee2e6] flex items-center gap-2.5"
        >
          <label htmlFor="gemma-chat-input" className="sr-only">
            Enter a study question about your local SIET-LMS course materials
          </label>
          <input
            id="gemma-chat-input"
            type="text"
            placeholder="Ask a question about ER diagrams, Candidate Keys, SQL DDL/DML, or 25ENS311 Quants..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isGenerating}
            className="flex-1 h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="h-10 px-4 rounded-lg bg-[#015303] hover:bg-[#0f6b3e] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </main>
  );
};
