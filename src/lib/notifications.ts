/**
 * Privacy-safe local reminder scheduler.
 *
 * Strategy:
 *   - User picks a reminder time (HH:MM) and toggles reminders ON.
 *   - While the app is open we run a setInterval that checks every minute
 *     and asks the active service worker to call showNotification once per day.
 *   - Notification body never reveals the habit ("New message from Sirat"),
 *     matching the "privacy" KPI from Day 4.
 *
 * This is fully offline and uses zero external libraries.
 */

const KEY_ENABLED = 'sirat-notif-enabled';
const KEY_TIME = 'sirat-notif-time';      // "HH:MM"
const KEY_LAST = 'sirat-notif-last-date'; // YYYY-MM-DD

export const NOTIF_DEFAULT_TIME = '08:30';

export const getReminderEnabled = (): boolean =>
  localStorage.getItem(KEY_ENABLED) === 'true';

export const getReminderTime = (): string =>
  localStorage.getItem(KEY_TIME) || NOTIF_DEFAULT_TIME;

export const setReminderTime = (hhmm: string) => {
  localStorage.setItem(KEY_TIME, hhmm);
};

export const setReminderEnabled = (on: boolean) => {
  localStorage.setItem(KEY_ENABLED, on ? 'true' : 'false');
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return await Notification.requestPermission();
};

const PRIVATE_TITLES: Record<string, { title: string; body: string }> = {
  ar: { title: 'صِراط', body: 'لديك رسالة جديدة 🌱' },
  en: { title: 'Sirat', body: 'You have a new message 🌱' },
  fr: { title: 'Sirat', body: 'Vous avez un nouveau message 🌱' },
  kab: { title: 'Sirat', body: 'Tesɛiḍ izen amaynut 🌱' },
  zh: { title: 'Sirat', body: '您有一条新消息 🌱' },
};

const getCopy = () => {
  const lang = localStorage.getItem('sirat-lang') || 'ar';
  return PRIVATE_TITLES[lang] || PRIVATE_TITLES.ar;
};

/** Ask the active service worker to show a privacy-safe notification. */
export const showLocalReminder = async (tag = 'sirat-daily') => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const copy = getCopy();
  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (reg && reg.active) {
    reg.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: copy.title,
      body: copy.body,
      tag,
      url: '/chat',
    });
  } else if ('Notification' in window) {
    new Notification(copy.title, { body: copy.body, tag, icon: '/favicon.ico' });
  }
};

/** Boots the daily-tick loop; safe to call once on app mount. */
export const startReminderScheduler = () => {
  const tick = () => {
    if (!getReminderEnabled()) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const [h, m] = getReminderTime().split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;

    // Trigger once per local date, on/after the scheduled minute.
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const last = localStorage.getItem(KEY_LAST);
    if (last === today) return;

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const targetMin = h * 60 + m;
    if (nowMin >= targetMin) {
      localStorage.setItem(KEY_LAST, today);
      void showLocalReminder();
    }
  };

  tick();
  return window.setInterval(tick, 60 * 1000);
};
