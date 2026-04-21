/**
 * WebLLM provider — runs the model inside a Web Worker via WebGPU.
 * UI stays at 60fps because token generation never touches the main thread.
 */
import {
  CreateWebWorkerMLCEngine,
  type MLCEngineInterface,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import type { AIProvider, EngineState, StreamOptions } from '../types';
import { SYSTEM_PROMPT } from '../types';
import { buildProgressContext } from '../context';

// Small, fast model (~350MB) — keeps RAM under 1.5GB and downloads quickly.
// Llama-3.2-1B remains a future "high quality" option without code changes.
const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

const listeners = new Set<(s: EngineState) => void>();
let state: EngineState = { status: 'idle', progressText: '', progress: 0 };
let enginePromise: Promise<MLCEngineInterface> | null = null;
let engineInstance: MLCEngineInterface | null = null;
let worker: Worker | null = null;

const setState = (next: Partial<EngineState>) => {
  state = { ...state, ...next };
  listeners.forEach(l => l(state));
};

const isSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'gpu' in navigator;

const ensure = async (): Promise<void> => {
  if (engineInstance) return;
  if (!isSupported()) {
    setState({ status: 'unsupported', error: 'WebGPU not available' });
    throw new Error('WebGPU not available');
  }
  if (enginePromise) {
    await enginePromise;
    return;
  }

  setState({ status: 'loading', progress: 0, progressText: 'بدء التحميل…' });

  worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });

  enginePromise = CreateWebWorkerMLCEngine(worker, MODEL_ID, {
    initProgressCallback: (r: InitProgressReport) => {
      setState({
        progress: r.progress ?? 0,
        progressText: r.text ?? '',
      });
    },
  })
    .then(eng => {
      engineInstance = eng;
      setState({ status: 'ready', progress: 1, progressText: 'جاهز' });
      return eng;
    })
    .catch(err => {
      enginePromise = null;
      setState({ status: 'error', error: String(err?.message ?? err) });
      throw err;
    });

  await enginePromise;
};

const streamChat = async ({
  messages,
  onDelta,
  signal,
  includeProgress = true,
}: StreamOptions): Promise<string> => {
  await ensure();
  const engine = engineInstance!;

  const systemMessages: { role: 'system'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  if (includeProgress) {
    try {
      const ctx = await buildProgressContext();
      systemMessages.push({ role: 'system', content: ctx });
    } catch {
      /* non-fatal */
    }
  }

  const fullMessages = [
    ...systemMessages,
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  let full = '';
  const stream = await engine.chat.completions.create({
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 512,
  });

  for await (const chunk of stream as AsyncIterable<{
    choices: { delta: { content?: string } }[];
  }>) {
    if (signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      onDelta(delta);
    }
  }
  return full;
};

const unload = async (): Promise<void> => {
  try {
    if (engineInstance) await engineInstance.unload();
  } catch {
    /* ignore */
  }
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  // Best-effort: clear cached model weights from Cache API.
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k.includes('webllm') || k.includes(MODEL_ID)).map(k => caches.delete(k)),
      );
    } catch {
      /* ignore */
    }
  }
  engineInstance = null;
  enginePromise = null;
  worker = null;
  setState({ status: 'idle', progress: 0, progressText: '', error: undefined });
};

export const webllmProvider: AIProvider = {
  isSupported,
  ensure,
  streamChat,
  unload,
  subscribe: l => {
    listeners.add(l);
    l(state);
    return () => listeners.delete(l);
  },
  getState: () => state,
};
