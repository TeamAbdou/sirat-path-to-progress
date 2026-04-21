/**
 * Native provider stub — placeholder for a future Tauri/Electron build that
 * runs llama.cpp (or similar) outside the browser. Today it just throws.
 */
import type { AIProvider, EngineState } from '../types';

const state: EngineState = {
  status: 'unsupported',
  progress: 0,
  progressText: '',
  error: 'Native provider not implemented in web build',
};

export const nativeProvider: AIProvider = {
  isSupported: () => false,
  ensure: async () => {
    throw new Error('Native AI provider not implemented in web build');
  },
  streamChat: async () => {
    throw new Error('Native AI provider not implemented in web build');
  },
  unload: async () => {},
  subscribe: l => {
    l(state);
    return () => {};
  },
  getState: () => state,
};
