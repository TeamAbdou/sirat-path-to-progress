/**
 * Native provider — talks to the IqlaDIM local FastAPI server
 * (see /server/main.py). Activated via VITE_AI_PROVIDER=native.
 *
 * The server runs Gemma + LoRA on the user's own machine, so the
 * "local-first / 100% private" promise is preserved.
 */
import type { AIProvider, EngineState, StreamOptions } from '../types';
import { SYSTEM_PROMPT } from '../types';
import { buildProgressContext } from '../context';

const BASE_URL =
  (import.meta.env.VITE_NATIVE_AI_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000';

const listeners = new Set<(s: EngineState) => void>();
let state: EngineState = { status: 'idle', progressText: '', progress: 0 };
let healthPromise: Promise<void> | null = null;

const setState = (next: Partial<EngineState>) => {
  state = { ...state, ...next };
  listeners.forEach(l => l(state));
};

const isSupported = (): boolean => typeof fetch !== 'undefined';

const ensure = async (): Promise<void> => {
  if (state.status === 'ready') return;
  if (healthPromise) return healthPromise;

  setState({ status: 'loading', progress: 0.1, progressText: 'الاتصال بخادم IqlaDIM المحلي…' });

  healthPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/health`, { method: 'GET' });
      if (!res.ok) throw new Error(`health ${res.status}`);
      const info = (await res.json()) as { model?: string; device?: string };
      setState({
        status: 'ready',
        progress: 1,
        progressText: `جاهز • ${info.model ?? 'IqlaDIM'} (${info.device ?? 'local'})`,
      });
    } catch (err) {
      healthPromise = null;
      const msg = `تعذّر الاتصال بـ ${BASE_URL}. شغّل: cd server && python main.py`;
      setState({ status: 'error', error: msg });
      throw new Error(msg);
    }
  })();

  return healthPromise;
};

const streamChat = async ({
  messages,
  onDelta,
  signal,
  includeProgress = true,
  challengeId,
}: StreamOptions): Promise<string> => {
  await ensure();

  const systemMessages: { role: 'system'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  if (includeProgress) {
    try {
      const ctx = await buildProgressContext({ challengeId });
      systemMessages.push({ role: 'system', content: ctx });
    } catch {
      /* non-fatal */
    }
  }

  const body = {
    messages: [
      ...systemMessages,
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 512,
  };

  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`IqlaDIM /chat failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';

  while (true) {
    if (signal?.aborted) {
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines.
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const evt of parts) {
      const line = evt.split('\n').find(l => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return full;
      try {
        const json = JSON.parse(payload) as { delta?: string; error?: string };
        if (json.error) throw new Error(json.error);
        if (json.delta) {
          full += json.delta;
          onDelta(json.delta);
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
  return full;
};

const unload = async (): Promise<void> => {
  healthPromise = null;
  setState({ status: 'idle', progress: 0, progressText: '', error: undefined });
};

/**
 * Send a recorded audio Blob to the local Whisper endpoint.
 * Exposed for MicButton / voice flows.
 */
export const transcribeAudio = async (
  blob: Blob,
  language?: string,
): Promise<string> => {
  const fd = new FormData();
  fd.append('file', blob, 'audio.webm');
  if (language) fd.append('language', language);
  const res = await fetch(`${BASE_URL}/stt`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? '';
};

export const nativeProvider: AIProvider = {
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
