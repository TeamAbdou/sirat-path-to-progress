

## اليوم الأول: تحويل Sirat إلى تطبيق محلي بالكامل (Local-First)

### الهدف
نقل التطبيق من الاعتماد على Supabase + Gemini السحابي إلى العمل 100% داخل المتصفح: تخزين IndexedDB مشفّر + ذكاء اصطناعي محلي عبر WebLLM + لا حسابات ولا مصادقة.

---

### الخطوات

**1. طبقة التخزين المحلية (`src/lib/localdb/`)**
- إضافة Dexie.js كاعتماد جديد.
- إنشاء `db.ts` يعرّف 5 جداول: `messages`, `progress`, `badges`, `preferences`, `meta`.
- `crypto.ts`: توليد مفتاح AES-GCM مرة واحدة عبر WebCrypto وتخزينه في جدول `meta` (مع IV لكل سجل). دوال `encrypt(value)` / `decrypt(blob)`.
- `repository.ts`: واجهة CRUD موحّدة (`addMessage`, `listMessages`, `upsertProgress`, ...) تشفّر/تفكّ شفرة الحقول الحساسة تلقائياً (محتوى الرسائل، التقدم).

**2. نظام إدارة الحالة المحلي (`src/contexts/LocalProfileContext.tsx`)**
- استبدال `useAuth` بـ `useLocalProfile`: يولّد `profileId` (UUID) عند أول تشغيل ويخزّنه في `meta`.
- React Query hooks (`useMessages`, `useProgress`, `useBadges`) تكتب فوراً إلى IndexedDB ثم تُحدّث الـ cache → استجابة <50ms.

**3. ذكاء اصطناعي محلي (`src/lib/llm/`)**
- إضافة `@mlc-ai/web-llm`.
- `engine.ts`: تحميل كسول لنموذج صغير (مثل `Llama-3.2-1B-Instruct-q4f16_1-MLC` ~700MB) في Web Worker.
- شاشة تحميل أولي مرة واحدة (مع شريط تقدم + تخزين في Cache API).
- `streamChat()` يبثّ الرموز إلى الواجهة بنفس واجهة `streamChat` الحالية → `ChatPage` لا يحتاج تغييراً يُذكر.
- البرومبت "مرشد صراط" يُحقن محلياً في `engine.ts`.

**4. تطهير الكود من Supabase**
- حذف الملفات: `integrations/supabase/*`, `hooks/useAuth.ts`, `hooks/useAdmin.ts`, `lib/securityLogger.ts`, `lib/rateLimit.ts`, `lib/guestMigration.ts`.
- حذف الصفحات: `AuthPage`, `ResetPasswordPage`, `AdminDashboard`, `AdminDonations`, `AdminSecurityLogs`, `DonatePage`, `ContactPage`, `GuestChatPage`.
- تبسيط `App.tsx`: لا فرع `!user`، يدخل المستخدم مباشرة لـ `HomePage`.
- تحديث `ChatPage`, `ProgressPage`, `SettingsPage`, `BadgesDisplay`, `DisclaimerPopup` لاستخدام `repository` بدل supabase.
- إزالة `BottomNav` لروابط الأدمن/التبرع.

**5. طبقة الخصوصية**
- تعطيل أي `fetch` خارجي عبر CSP في `index.html` (`connect-src 'self' blob:`).
- إزالة استدعاءات الشبكة المتبقية (تحقق نهائي بالبحث عن `fetch(`, `supabase.`).
- ServiceWorker بسيط (`public/sw.js`) يخدم الأصول من Cache → دعم Airplane mode.

**6. التحقق (KPIs)**
- اختبار يدوي: قطع الإنترنت → فتح التطبيق → إرسال رسالة → إعادة تحميل → الرسالة موجودة.
- قياس `performance.now()` حول `addMessage` (يجب <50ms).
- تنظيف أخطاء الكونسول.

---

### ملاحظات مهمة

- **WebLLM يحتاج WebGPU**: على الأجهزة الضعيفة/المتصفحات القديمة قد لا يعمل. سنضيف fallback يعرض رسالة واضحة بدل التعطّل. (يمكن لاحقاً إضافة fallback إلى Lovable AI Gateway كخيار "Cloud mode" اختياري — ليس اليوم).
- **حجم النموذج**: التحميل الأول ~700MB لمرة واحدة فقط (يُخزَّن في المتصفح). سنوضّحه للمستخدم.
- **حذف Supabase**: لن نحذف مشروع Cloud من جهة Lovable (قد يُفيد لاحقاً)، فقط نزيل كل اعتماد عليه من الكود.
- **جداول الذاكرة (memory)**: عدة memories ستصبح غير دقيقة (auth, donations, admin, contact). سأحدّثها بعد الموافقة.
- **الذي لن يعمل بعد اليوم**: التبرعات، لوحة الأدمن، التواصل، استرجاع كلمة المرور، تزامن بين الأجهزة.

