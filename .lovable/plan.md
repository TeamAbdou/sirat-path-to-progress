

## اليوم الثاني: محرك التتبع المحلي + لوحة التحليلات + جسر السياق للذكاء الاصطناعي

### الهدف
تحويل صفحة Progress من عدّاد بسيط إلى محرك تتبع حقيقي مع streaks دقيقة، رسوم بيانية، أوسمة تلقائية، وجسر يُمرّر بيانات التقدم إلى المرشد المحلي.

---

### 1. توسيع طبقة التخزين (`src/lib/localdb/`)

**`db.ts`** — رفع نسخة Dexie إلى v2 وإضافة جدولين بدون كسر البيانات الحالية:
- `dailyEntries`: `[challengeId+date], date` — سجل لكل يوم: `{ challengeId, date: 'YYYY-MM-DD', status: 'clean'|'relapse', iv?, ct?(note مشفّرة), createdAt }`. هذا مصدر الحقيقة للرسوم.
- يبقى `progress` مُلخّصاً مشتقّاً (يُعاد حسابه من `dailyEntries`).

**`repository.ts`** — دوال جديدة:
- `markDay(challengeId, date, status, note?)` — يكتب/يستبدل اليوم، ثم يستدعي `recomputeProgress`.
- `recomputeProgress(challengeId)` — يقرأ كل `dailyEntries` للتحدي، يحسب `daysClean`, `currentStreak`, `bestStreak` بدقة (يحترم timezone الجهاز عبر `Date` محلي + مفتاح `YYYY-MM-DD` بالتوقيت المحلي، ويعتبر السلسلة منكسرة عند يوم relapse أو فجوة >1 يوم).
- `listEntries(challengeId, fromDate, toDate)` — للرسوم.
- `listAllProgress()` — لوحة عامة عبر كل التحديات.

**`crypto.ts`** — لا تغيير (نُعيد استخدام AES-GCM الموجود لتشفير `note` فقط؛ `status` و`date` يبقيان نصاً للاستعلام السريع).

### 2. محرك الأوسمة التلقائي (`src/lib/badges/observer.ts`)

دالة نقية `evaluateBadges({ progress, allProgress, entries }) → string[]` تُرجع قائمة badgeIds المستحقة بناءً على `BADGES` الموجود:
- `badge_day1` — `daysClean >= 1`
- `badge_week_stable` / `badge_7days_purity` — `currentStreak >= 7`
- `badge_month_purity` — `currentStreak >= 30`
- `badge_5steps` — `tipsFollowed >= 5`
- `badge_return_spiritual` — streak ≥7 على تحدي `notPraying`
- `badge_boundary_guard` — يبقى يدوياً (يُمنح من زر داخل SOS لاحقاً، خارج نطاق اليوم)

`awardNewBadges()` يُقارن مع `listBadges()` ويمنح الجديد فقط، ويُرجع المُكتسب حديثاً → `ProgressPage` يعرض toast احتفالي.

### 3. لوحة الإحصائيات (`src/components/ProgressCharts.tsx`)

باستخدام `recharts` (موجود مسبقاً، بدون تبعيات جديدة):
- **Bar chart** آخر 7 أيام (نظيف=أخضر، انتكاسة=أحمر، فارغ=رمادي).
- **Line chart** آخر 30 يوماً يُظهر `currentStreak` التراكمي.
- **Donut صغير** نسبة الأيام النظيفة هذا الشهر.
- كل البيانات تُقرأ من `listEntries` في `useEffect` واحد، وتُحفظ في state محلي.

### 4. تحديث `ProgressPage.tsx`

- استبدال `markToday` بزرّين: **"يوم نظيف ✓"** و **"انتكاسة"** — كلاهما يستدعي `markDay`.
- بعد الكتابة: `recomputeProgress` → `awardNewBadges` → toast لكل وسام جديد.
- قياس الأداء: `performance.now()` حول العملية الكاملة، تحذير console إذا >30ms (للتحقق من KPI).
- إضافة `<ProgressCharts challengeId={...} />` فوق `BadgesDisplay`.

### 5. جسر السياق للذكاء الاصطناعي (`src/lib/llm/context.ts`)

- `buildProgressContext(): Promise<string>` — يقرأ `listAllProgress()` + `listBadges()` ويُرجع نصاً موجزاً مثل:
  ```
  [Progress snapshot — local only]
  pornography: 5 days clean, current streak 5, best 12.
  smoking: 0 days clean.
  Badges earned: badge_day1, badge_5steps.
  Today: 2026-04-20.
  ```
- `engine.ts` → `streamChat` يقبل خياراً جديداً `includeProgress?: boolean` (افتراضي `true`). عند تفعيله، يُحقن النص بعد `SYSTEM_PROMPT` كرسالة system ثانية.
- النتيجة: عندما يسأل المستخدم "كيف حالي؟"، النموذج يجاوب بأرقامه الحقيقية بدون أي سيرفر.

### 6. التحقق من KPIs

- أداء: `console.time('markDay')` داخل التدفق — يجب <30ms.
- خصوصية: تأكيد أن جدول `dailyEntries` في DevTools → IndexedDB يُظهر `iv`/`ct` للملاحظات (الحقول العامة فقط `date`/`status` لتسريع الاستعلام).
- سلاسل: اختبار حالات (يوم اليوم، أمس فقط، فجوة يومين، انتكاسة في الوسط) عبر تعديل تواريخ يدوياً في الكونسول.

---

### ملاحظات

- **بدون تبعيات جديدة**: `recharts`, `dexie`, `lucide-react` كلها موجودة.
- **توافق رجعي**: الـ `progress` table يبقى موجوداً ومُحدّثاً، فلا انكسار للبيانات الموجودة.
- **خارج النطاق اليوم**: تعديل/حذف يوم سابق من الواجهة (ممكن لاحقاً)، تصدير CSV، Web Notifications للتذكير اليومي (موجود بالفعل في `useNotifications`).

