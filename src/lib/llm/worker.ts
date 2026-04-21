/// <reference lib="webworker" />
/**
 * Web Worker that hosts the WebLLM engine off the main thread.
 * The main thread talks to it via CreateWebWorkerMLCEngine.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
