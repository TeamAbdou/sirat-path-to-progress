/**
 * AI engine facade — selects a provider (WebLLM today, native tomorrow)
 * and re-exports a stable API the rest of the app uses.
 *
 * To swap providers, set VITE_AI_PROVIDER=native (future Tauri build).
 */
import { webllmProvider } from './providers/webllm';
import { nativeProvider } from './providers/native';
import type { AIProvider, EngineState, StreamOptions } from './types';

export type { ChatMsg, StreamOptions, EngineState } from './types';

const providerName = (import.meta.env.VITE_AI_PROVIDER as string | undefined) ?? 'webllm';
const provider: AIProvider = providerName === 'native' ? nativeProvider : webllmProvider;

export const isWebGPUAvailable = (): boolean => provider.isSupported();
export const ensureEngine = (): Promise<void> => provider.ensure();
export const streamChat = (opts: StreamOptions): Promise<string> => provider.streamChat(opts);
export const unloadEngine = (): Promise<void> => provider.unload();
export const subscribeEngine = (l: (s: EngineState) => void): (() => void) =>
  provider.subscribe(l);
export const getEngineState = (): EngineState => provider.getState();
