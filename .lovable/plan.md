

## اليوم الثالث: عزل محرك الذكاء الاصطناعي في Web Worker + جاهزية سطح المكتب

### الوضع الحالي
`@mlc-ai/web-llm` مُدمج بالفعل ويعمل على WebGPU، لكنه يعمل على **الخيط الرئيسي (Main Thread)** — ما يعني أن واجهة الشات تتجمّد أثناء توليد الرموز. اليوم نُصلح ذلك ونُحسّن الهيكلة.

---

### 1. عزل النموذج في Web Worker

**`src/lib/llm/worker.ts`** (جديد)
- Web Worker يستضيف `WebWorkerMLCEngineHandler` من `@mlc-ai/web-llm`.
- يستقبل أوامر التحميل والمحادثة عبر `postMessage`.
- يبث تقدم التحميل والرموز للخيط الرئيسي.

**`src/lib/llm/engine.ts`** (إعادة هيكلة)
- استبدال `CreateMLCEngine` بـ `CreateWebWorkerMLCEngine` التي تتواصل مع الـ Worker تلقائياً.
- نفس واجهة `streamChat`/`subscribeEngine`/`ensureEngine` تبقى كما هي → `ChatPage` لا يتغير.
- النتيجة: الواجهة تبقى سريعة الاستجابة (60fps) أثناء الاستدلال.

### 2. اختيار النموذج التجريبي + Fallback

- النموذج الأساسي: `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (~350MB، أصغر من Llama-3.2-1B الحالي وأخف على الذاكرة، يحقق KPI <1.5GB RAM).
- إبقاء `Llama-3.2-1B` كخيار "جودة أعلى" يمكن للمستخدم اختياره لاحقاً (بدون تفعيل اليوم).
- WebLLM يستخدم Cache API تلقائياً لتخزين أوزان النموذج → لا حاجة لإعداد إضافي.
- WASM fallback: WebLLM لا يدعم WASM-only للنماذج اللغوية حالياً (يحتاج WebGPU). نُبقي رسالة الـ fallback الواضحة الموجودة في `LocalAIStatus` ونوضّح للمستخدم متطلبات Chrome/Edge مع WebGPU.

### 3. واجهة تحميل محسّنة (`LocalAIStatus.tsx`)

- إضافة عرض **MB المُحمَّلة / MB الكلية** بجانب نسبة التقدم (يستخرجها من `InitProgressReport.text`).
- زر "إلغاء/إيقاف مؤقت" أثناء التحميل.
- بعد التحميل: شارة "النموذج محفوظ محلياً" + زر "حذف النموذج" يستدعي `engine.unload()` ويُفرّغ Cache API لمفتاح النموذج (لاسترجاع المساحة).

### 4. هيكلة جاهزة لسطح المكتب (`src/lib/llm/`)

إعادة تنظيم الملفات بحيث يكون منطق الـ AI خلف **interface واحدة**:
```
src/lib/llm/
  ├── types.ts           ← ChatMsg, StreamOptions, EngineState, AIProvider interface
  ├── engine.ts          ← مُنسّق عام (يختار provider)
  ├── providers/
  │   ├── webllm.ts      ← التطبيق الحالي (Web Worker + WebGPU)
  │   └── native.ts      ← stub فارغ يُلقي "not implemented" — placeholder لـ Tauri/Electron لاحقاً
  ├── worker.ts          ← Web Worker
  └── context.ts         ← (موجود) جسر التقدم
```
- `engine.ts` يقرأ `import.meta.env.VITE_AI_PROVIDER` (افتراضي `webllm`) لاختيار الـ provider.
- النتيجة: لتغليف التطبيق لاحقاً كـ Tauri مع llama.cpp، نكتب `native.ts` فقط دون لمس `ChatPage` أو أي UI.

### 5. التحقق من KPIs

- **Offline**: قطع الشبكة → إعادة تحميل التطبيق → النموذج يُقلع من الكاش → سؤال يُرد عليه.
- **عدم تجمّد UI**: التمرير في الشات أثناء التوليد يبقى سلساً (Web Worker).
- **الذاكرة**: مراقبة `performance.memory.usedJSHeapSize` (Chrome) — يجب <1.5GB مع Qwen-0.5B.
- **جسر السياق**: التأكد من أن `buildProgressContext` لا يزال يُحقن (موجود في `streamChat`). اختبار: "كم يوم نظيف؟" يجب أن يرد بالعدد الفعلي.

---

### ملاحظات

- **بدون تبعيات جديدة**: `@mlc-ai/web-llm` موجود ويُصدّر `CreateWebWorkerMLCEngine` و `WebWorkerMLCEngineHandler`.
- **توافق رجعي**: المستخدمون الذين حمّلوا Llama-3.2-1B سابقاً سيحمّلون Qwen-0.5B عند أول دخول. النموذج القديم يبقى في الكاش (يمكن حذفه يدوياً من زر الإعدادات).
- **Vite + Worker**: نستخدم `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` — Vite يتعامل مع البناء تلقائياً.
- **خارج النطاق اليوم**: تبديل النماذج من واجهة الإعدادات، WASM fallback لمتصفحات Safari (يحتاج إعادة هيكلة كبيرة)، ضغط النموذج (Q3).

