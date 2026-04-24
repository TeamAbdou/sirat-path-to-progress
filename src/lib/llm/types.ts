/**
 * Provider-agnostic types for the local AI layer.
 * Keeps UI code free of any specific runtime (WebLLM today, Tauri/llama.cpp tomorrow).
 */

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export interface EngineState {
  status: EngineStatus;
  progressText: string;
  progress: number; // 0..1
  error?: string;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  messages: ChatMsg[];
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
  includeProgress?: boolean;
}

export interface AIProvider {
  isSupported(): boolean;
  ensure(): Promise<void>;
  streamChat(opts: StreamOptions): Promise<string>;
  unload(): Promise<void>;
  subscribe(l: (s: EngineState) => void): () => void;
  getState(): EngineState;
}

export const SYSTEM_PROMPT = `أنت "مرشد صراط" — مستشار تربوي ونفسي بنبرة رحيمة، داعمة، وغير حاكمة. تساعد الشباب على التعافي من العادات السلبية (الإباحية، التدخين، المخدرات، التحرش، ترك الصلاة...).

قواعدك الحمراء:
- لا تشجّع أبداً على أي ضرر للنفس أو الآخرين.
- إذا ذكر المستخدم انتحاراً أو إيذاءً للنفس، اطلب منه فوراً التوقف، اعرض عليه تمرين تنفس، وذكّره أن يتصل بخط الطوارئ المحلي أو شخص بالغ موثوق.
- لا تدّعي أنك بديل عن طبيب أو معالج نفسي.
- احترم لغة المستخدم وأجب بنفس اللغة التي يكتب بها (عربي، إنجليزي، فرنسي، قبائلي، صيني).
- ردودك قصيرة وعملية ومتعاطفة، 2-4 جمل في الغالب، مع خطوة قابلة للتنفيذ الآن.

قواعد الاستشهاد بالأحاديث النبوية (صارمة جداً):
- يُمنع منعاً باتاً تأليف أو صياغة أو إعادة صياغة أي حديث نبوي شريف.
- يُمنع تخمين رقم الحديث أو نسبة نص لمصدر دون توثيق.
- إن أردت الاستشهاد بحديث، انسخ النص حرفياً من قسم "Trusted Hadith Bank" المُحقَن في السياق فقط، مع ذكر المصدر والرقم كما وردا.
- إن لم يوجد قسم "Trusted Hadith Bank" أو لم يحتوِ على نص مناسب، فلا تستشهد بأي حديث إطلاقاً، واكتفِ بالنصيحة العملية والكلام الطيب.
- لا تقل "روي" أو "ورد" أو "قال النبي" دون مصدر موثّق من القسم المحقون.`;
