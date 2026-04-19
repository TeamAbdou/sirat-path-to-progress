/**
 * Local in-browser LLM engine using @mlc-ai/web-llm (WebGPU).
 * Lazy-loads on first use; subsequent calls reuse the same engine instance.
 *
 * Sirat persona is injected as a system message here so the rest of the app
 * never has to know about the prompt.
 */
import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';

// Small model that works on most devices with WebGPU. ~700MB on first download,
// fully cached in the browser afterwards.
const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

const SYSTEM_PROMPT = `أنت "مرشد صراط" — مستشار تربوي ونفسي بنبرة رحيمة، داعمة، وغير حاكمة. تساعد الشباب على التعافي من العادات السلبية (الإباحية، التدخين، المخدرات، التحرش، ترك الصلاة...).

قواعدك الحمراء:
- لا تشجّع أبداً على أي ضرر للنفس أو الآخرين.
- إذا ذكر المستخدم انتحاراً أو إيذاءً للنفس، اطلب منه فوراً التوقف، اعرض عليه تمرين تنفس، وذكّره أن يتصل بخط الطوارئ المحلي أو شخص بالغ موثوق.
- لا تدّعي أنك بديل عن طبيب أو معالج نفسي.
- احترم لغة المستخدم وأجب بنفس اللغة التي يكتب بها (عربي، إنجليزي، فرنسي، قبائلي، صيني).
- ردودك قصيرة وعملية ومتعاطفة، 2-4 جمل في الغالب، مع خطوة قابلة للتنفيذ الآن.`;

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

interface EngineState {
  status: Status;
  progressText: string;
  progress: number; // 0..1
  error?: string;
}

const listeners = new Set<(s: EngineState) => void>();
let state: EngineState = { status: 'idle', progressText: '', progress: 0 };
let enginePromise: Promise<MLCEngine> | null = null;
let engineInstance: MLCEngine | null = null;

const setState = (next: Partial<EngineState>) => {
  state = { ...state, ...next };
  listeners.forEach(l => l(state));
};

export const subscribeEngine = (l: (s: EngineState) => void): (() => void) => {
  listeners.add(l);
  l(state);
  return () => listeners.delete(l);
};

export const getEngineState = (): EngineState => state;

export const isWebGPUAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
};

export const ensureEngine = async (): Promise<MLCEngine> => {
  if (engineInstance) return engineInstance;
  if (!isWebGPUAvailable()) {
    setState({ status: 'unsupported', error: 'WebGPU not available in this browser' });
    throw new Error('WebGPU not available');
  }
  if (enginePromise) return enginePromise;

  setState({ status: 'loading', progress: 0, progressText: 'بدء التحميل…' });

  enginePromise = CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (r: InitProgressReport) => {
      setState({
        progress: r.progress ?? 0,
        progressText: r.text ?? '',
      });
    },
  }).then(eng => {
    engineInstance = eng;
    setState({ status: 'ready', progress: 1, progressText: 'جاهز' });
    return eng;
  }).catch(err => {
    enginePromise = null;
    setState({ status: 'error', error: String(err?.message ?? err) });
    throw err;
  });

  return enginePromise;
};

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  messages: ChatMsg[];
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}

export const streamChat = async ({ messages, onDelta, signal }: StreamOptions): Promise<string> => {
  const engine = await ensureEngine();

  const fullMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  let full = '';
  // web-llm's chat.completions.create with stream:true returns an async iterable
  const stream = await engine.chat.completions.create({
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 512,
  });

  for await (const chunk of stream as AsyncIterable<{ choices: { delta: { content?: string } }[] }>) {
    if (signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      onDelta(delta);
    }
  }
  return full;
};
