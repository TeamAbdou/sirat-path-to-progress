# خطة اليوم الخامس — Sirat-Tiny

ملاحظة: لن يتم بناء `hadith-bank.ts` فعلياً حتى ترسل النصوص الموثقة. سأجهّز كل البنية حوله بملف فارغ مع TODO حتى لا نخاطر بأي خطأ شرعي.

---

## 1. الهوية الروحية الموثوقة (Spiritual Identity Layer)

**أ. الإعدادات (**`SettingsPage.tsx`**)**

- إضافة قسم جديد "التوجيه الروحي" بمفتاح Toggle: "هل أنت مسلم؟" (افتراضي: مُغلق).
- يُحفظ في IndexedDB عبر `setPreferenceRaw('isMuslim', boolean)`.
- نص توضيحي: "عند التفعيل، سيستشهد المرشد بأحاديث صحيحة من قاعدة بيانات محلية موثوقة فقط (البخاري ومسلم) — لن يُؤلَّف أي نص."

**ب. قاعدة البيانات الثابتة (**`src/lib/hadith-bank.ts`**)**

- نوع البيانات:
  ```ts
  interface Hadith {
    id: string;            // bukhari-6116
    arabic: string;        // النص الكامل
    source: 'Bukhari' | 'Muslim';
    number: number;        // رقم الحديث في المصدر
    moods: ('patience'|'hope'|'discipline'|'intention'|'repentance')[];
  }
  export const HADITH_BANK: readonly Hadith[] = []; // TODO: fill from user
  ```
- ملف فارغ مع تعليق صريح: لا تُضاف نصوص دون مراجعة المستخدم.
- دالة `pickHadithForMood(mood, count=1)` لاختيار حديث ذي صلة بشكل حتمي (ليس عشوائياً عبر الـ AI).

**ج. كاشف الحالة (**`src/lib/llm/mood-detector.ts`**)**

- دالة بسيطة تستنتج الحالة من آخر رسالتين للمستخدم + حالة التقدم (انتكاسة حديثة → repentance/hope، انضباط جيد → patience).
- بدون أي نموذج خارجي، فقط كلمات مفتاحية لكل لغة.

**د. الحقن الموثوق (**`src/lib/llm/context.ts` **+** `providers/webllm.ts`**)**

- توسيع `buildProgressContext` ليأخذ `{ isMuslim }` ويُضيف كتلة:
  ```
  [Trusted Hadith Bank — verbatim, do NOT paraphrase, do NOT add others]
  - "النص" — صحيح البخاري #6116
  ```
- تعديل `SYSTEM_PROMPT` (في `types.ts`) بإضافة تعليمات صارمة:
  - "يُمنع منعاً باتاً تأليف أو صياغة أي حديث نبوي."
  - "إن أردت الاستشهاد بحديث، انسخ النص حرفياً من قسم Trusted Hadith Bank فقط، مع ذكر المصدر والرقم."
  - "إن لم يوجد حديث مناسب، لا تستشهد بأي حديث ولا تخترع."
- يُحقن القسم فقط إذا `isMuslim === true` وقاعدة البيانات غير فارغة.

---

## 2. الصقل البصري (UI/UX Polish)

**أ. الطبوغرافيا (**`src/index.css` **+** `tailwind.config.ts`**)**

- إضافة Tajawal إلى `@import` Google Fonts (وزن 400/500/700) + الاحتفاظ بـ IBM Plex Sans Arabic.
- `font-display` للعناوين: Tajawal، `font-body` للمتن: IBM Plex Sans Arabic / Inter.
- إضافة `font-family` tokens في tailwind وتطبيقها على `h1-h3` عبر `@layer base`.

**ب. تحسين الوضع الداكن (**`src/index.css`**)**

- رفع تباين النص الرئيسي في `.dark` من `160 15% 92%` إلى `160 20% 95%`.
- خفض سطوع الخلفية قليلاً (`200 25% 6%`) وزيادة فرق `--card` عن `--background` ليكون التمييز أوضح.
- زيادة تباين `--muted-foreground` لتلبية WCAG AA على المتن العربي.

**ج. Micro-interactions (**`framer-motion`**)**

- `RoutedPages` موجود بالفعل — تحسين منحنى الحركة إلى `[0.22, 1, 0.36, 1]` (easeOutExpo) مع stagger خفيف.
- إضافة Tap feedback (`whileTap={{ scale: 0.97 }}`) لأزرار `BottomNav` الثلاثة الرئيسية (Home, Progress, SOS).

---

## 3. تحسين الأداء

**أ. ذاكرة الـ Web Worker (**`src/lib/llm/providers/webllm.ts`**)**

- بعد كل بث، إعادة تعيين أي مراجع للـ `stream` (هي محلية حالياً وجيدة) — توثيق ذلك.
- إضافة `engine.resetChat()` بعد كل محادثة منتهية لمنع نمو KV-cache غير المنضبط على رسائل طويلة.
- التحقق من أن `onbeforeunload` لا يترك عمالاً معلّقين (إضافة استدعاء `unload` عند `pagehide`).

**ب. تشفير غير حاجب (**`src/lib/localdb/repository.ts` **+ crypto)**

- `listMessages` حالياً يفك تشفير في حلقة `for await`. للنصوص الكبيرة: تقسيم على دفعات `Promise.all` بحجم 16 + `await new Promise(r => setTimeout(r, 0))` بين الدفعات للسماح للواجهة بالتنفس.
- `exportSirat`/`importSirat`: تأكيد أن التشفير الكتلي يحدث بعد `requestIdleCallback` متى أمكن.

**ج. Bundle size**

- فحص `package.json` لاستخدامات `lucide-react`/`recharts` غير المستعملة.
- التأكد من أن imports مفردة من `lucide-react` (هي كذلك أصلاً).
- مراجعة `radix-ui` المكوّنات — إزالة أي مكوّن `src/components/ui/*` غير مستورد فعلياً (فحص `rg`).

---

## 4. رحلة الانطلاق (Onboarding)

**ملف جديد** `src/components/Onboarding.tsx`

- 3 شرائح بـ swipe (framer-motion):
  1. "خصوصية 100% — كل شيء على جهازك"
  2. "يعمل بالكامل بدون إنترنت"
  3. "هدفنا إنساني، لسنا بديلاً عن طبيب"
- زر "ابدأ" في الشريحة الأخيرة → `setPreferenceRaw('onboardingDone', true)`.
- يُعرض في `AppShell` فقط إذا `!onboardingDone`، قبل `RoutedPages`.

---

## القسم التقني (الملفات)

**جديدة:**

- `src/lib/hadith-bank.ts` (هيكل + فارغ)
- `src/lib/llm/mood-detector.ts`
- `src/components/Onboarding.tsx`

**معدلة:**

- `src/lib/llm/types.ts` — تحديث `SYSTEM_PROMPT` (تحريم اختلاق الأحاديث)
- `src/lib/llm/context.ts` — توسيع `buildProgressContext({ isMuslim })`
- `src/lib/llm/providers/webllm.ts` — تمرير `isMuslim`، `resetChat` بعد البث، hook على `pagehide`
- `src/pages/SettingsPage.tsx` — قسم "التوجيه الروحي"
- `src/lib/localdb/repository.ts` — `listMessages` بدفعات
- `src/index.css` — Tajawal + تباين داكن أعلى
- `tailwind.config.ts` — `fontFamily.display/body`
- `src/components/BottomNav.tsx` — `whileTap`
- `src/App.tsx` — تركيب Onboarding + منحنى الحركة

---

## بعد الموافقة

سأنفّذ كل ما سبق ما عدا محتوى `HADITH_BANK` نفسه — سأنتظر إرسالك للقائمة (نص + مصدر + رقم) ثم ألصقها حرفياً في خطوة منفصلة قصيرة.