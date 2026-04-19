import { useEffect, useCallback } from 'react';

const NOTIFICATION_KEY = 'sirat-notifications-enabled';
const LAST_NOTIF_KEY = 'sirat-last-notification';

// Daily tips from the educational counselor (Copilot), one per day of the week
const dailyTips = {
  ar: [
    'حدد 3 بدائل قصيرة (رياضة 10 دقائق، قراءة فصل، مكالمة لصديق) وطبّق واحدة عند أول شعور بالرغبة. 💪',
    'قبل أن تكتب أو تشارك، اسأل نفسك: هل أود أن يُقال هذا الكلام لي؟ إذا لا، توقف وغيّر الموضوع فوراً. 🤔',
    'جهّز جملة رفض ومخرج آمن مثل: "لا شكراً، عندي موعد" ثم ابتعد فوراً عن المكان. 🚶',
    'جرّب قاعدة الدقائق العشر: انتظر 10 دقائق، اشرب ماء، تحرك، وستجد الرغبة تخف. ⏰',
    'ابدأ بصلاة واحدة يومياً لمدة أسبوع. اجعلها عادة صغيرة لا ضغط عليها واحتفل بأي تقدم. 🕌',
    'سجّل شعورك لمدة دقيقتين كل مساء: ما الذي أحسن اليوم؟ ما الذي أريد تغييره؟ 📝',
    'اختر شخصاً تثق به وشاركه هدفك هذا الأسبوع. وجود شخص واحد يدعمك يزيد فرص النجاح. 🤝',
  ],
  en: [
    'Set 3 short alternatives (10-min exercise, read a chapter, call a friend) and apply one at the first urge. 💪',
    'Before you write or share, ask yourself: would I want this said to me? If not, stop and change the subject. 🤔',
    'Prepare a refusal phrase and safe exit like: "No thanks, I have an appointment" then leave immediately. 🚶',
    'Try the 10-minute rule: wait 10 minutes, drink water, move around, and the urge will fade. ⏰',
    'Start with one prayer daily for a week. Make it a small habit without pressure and celebrate any progress. 🕌',
    'Journal your feelings for 2 minutes each evening: What went well today? What do I want to change? 📝',
    'Choose someone you trust and share your goal this week. Having one supporter increases your chances. 🤝',
  ],
};

export const useNotifications = () => {
  const isEnabled = localStorage.getItem(NOTIFICATION_KEY) === 'true';

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    localStorage.setItem(NOTIFICATION_KEY, String(granted));
    return granted;
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (isEnabled) {
      localStorage.setItem(NOTIFICATION_KEY, 'false');
      return false;
    }
    return requestPermission();
  }, [isEnabled, requestPermission]);

  useEffect(() => {
    if (!isEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const checkAndNotify = () => {
      const lastNotif = localStorage.getItem(LAST_NOTIF_KEY);
      const today = new Date().toDateString();
      if (lastNotif === today) return;

      const now = new Date();
      // Send notification around 8:30 AM (matching Copilot's default)
      if (now.getHours() >= 8) {
        const dayIndex = now.getDay(); // 0=Sun, 1=Mon...
        const lang = localStorage.getItem('sirat-lang') || 'ar';
        const tips = lang === 'ar' ? dailyTips.ar : dailyTips.en;
        const tip = tips[dayIndex % tips.length];

        new Notification('Sirat - صِراط', {
          body: tip,
          icon: '/favicon.ico',
          tag: 'daily-tip',
        });
        localStorage.setItem(LAST_NOTIF_KEY, today);
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isEnabled]);

  return { isEnabled, toggleNotifications, requestPermission };
};
