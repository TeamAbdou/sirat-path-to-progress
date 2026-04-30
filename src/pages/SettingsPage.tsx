import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { User, Globe, Check, Shield, AlertTriangle, Trash2, Cpu, Bell, Download, Upload, Heart, BookOpen, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lang, langNames } from '@/lib/i18n';
import {
  getPreferenceEncrypted,
  setPreferenceEncrypted,
  clearMessages,
  getPreferenceRaw,
  setPreferenceRaw,
} from '@/lib/localdb/repository';
import { hasHadiths } from '@/lib/hadith-bank';
import { db } from '@/lib/localdb/db';
import LocalAIStatus from '@/components/LocalAIStatus';
import {
  getReminderEnabled,
  getReminderTime,
  setReminderEnabled,
  setReminderTime,
  requestNotificationPermission,
  showLocalReminder,
  NOTIF_DEFAULT_TIME,
} from '@/lib/notifications';
import { exportSirat, importSirat, peekSirat, type SiratPreview } from '@/lib/sirat-file';
import { enableDemoMode } from '@/lib/demo-mode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const SettingsPage = () => {
  const { t, lang, setLang } = useApp();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  // Notifications
  const [notifOn, setNotifOn] = useState(getReminderEnabled());
  const [notifTime, setNotifTimeState] = useState(getReminderTime() || NOTIF_DEFAULT_TIME);

  // Export / Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    file: File;
    password: string;
    preview: SiratPreview;
  } | null>(null);

  // Spiritual identity
  const [isMuslim, setIsMuslim] = useState(false);

  useEffect(() => {
    getPreferenceEncrypted('displayName').then(v => {
      if (v) setDisplayName(v);
    });
    getPreferenceRaw<boolean>('isMuslim').then(v => setIsMuslim(!!v));
  }, []);

  const handleToggleMuslim = async () => {
    const next = !isMuslim;
    setIsMuslim(next);
    await setPreferenceRaw('isMuslim', next);
    toast.success(t.saved);
  };

  const handleSaveName = async () => {
    setSaving(true);
    await setPreferenceEncrypted('displayName', displayName);
    setSaving(false);
    toast.success(t.saved);
  };

  const handleLangChange = (newLang: Lang) => setLang(newLang);

  const handleWipe = async () => {
    const confirmMsg = lang === 'ar'
      ? 'سيتم حذف كل بياناتك المحلية (الرسائل، التقدم، الشارات). متأكد؟'
      : 'This will permanently delete all your local data (messages, progress, badges). Continue?';
    if (!window.confirm(confirmMsg)) return;
    await Promise.all([
      clearMessages(),
      db.progress.clear(),
      db.badges.clear(),
      db.preferences.clear(),
      db.dailyEntries.clear(),
    ]);
    toast.success(lang === 'ar' ? 'تم الحذف' : 'Wiped');
  };

  const handleToggleNotif = async () => {
    if (notifOn) {
      setReminderEnabled(false);
      setNotifOn(false);
      toast.success(lang === 'ar' ? 'أُوقفت التنبيهات' : 'Notifications off');
      return;
    }
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      toast.error(lang === 'ar' ? 'يجب السماح بالتنبيهات من إعدادات المتصفح.' : 'Browser notifications were denied.');
      return;
    }
    setReminderEnabled(true);
    setNotifOn(true);
    toast.success(lang === 'ar' ? 'تم تفعيل التنبيهات' : 'Notifications enabled');
  };

  const handleTimeChange = (v: string) => {
    setNotifTimeState(v);
    setReminderTime(v);
  };

  const handleTestNotif = async () => {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      toast.error(lang === 'ar' ? 'يجب السماح بالتنبيهات أولاً.' : 'Allow notifications first.');
      return;
    }
    void showLocalReminder('sirat-test');
  };

  const handleExport = async () => {
    const password = window.prompt(
      lang === 'ar'
        ? 'اختر كلمة سر لحماية ملفك (6 أحرف على الأقل):'
        : 'Choose a password to protect your file (min 6 chars):'
    );
    if (!password) return;
    if (password.length < 6) {
      toast.error(lang === 'ar' ? 'كلمة السر قصيرة جداً.' : 'Password too short.');
      return;
    }
    try {
      setBusy(true);
      const blob = await exportSirat(password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `sirat-journey-${stamp}.sirat`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === 'ar' ? 'تم تصدير رحلتك ✅' : 'Journey exported ✅');
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل التصدير.' : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const password = window.prompt(
      lang === 'ar' ? 'كلمة السر التي اخترتها عند التصدير:' : 'The password you chose when exporting:'
    );
    if (!password) return;
    try {
      setBusy(true);
      const preview = await peekSirat(file, password);
      setImportPreview({ file, password, preview });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    const { file, password } = importPreview;
    setImportPreview(null);
    try {
      setBusy(true);
      const stats = await importSirat(file, password);
      toast.success(
        lang === 'ar'
          ? `تم الاستيراد: ${stats.messages} رسالة، ${stats.entries} يوم، ${stats.badges} شارة.`
          : `Imported: ${stats.messages} messages, ${stats.entries} days, ${stats.badges} badges.`
      );
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const langs: Lang[] = ['ar', 'en', 'fr', 'kab', 'zh'];

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto space-y-6"
      >
        <h2 className="text-2xl font-bold text-foreground">{t.settings}</h2>

        {/* Display Name */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            {t.changeName}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
              dir="auto"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {t.save}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t.language}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {langs.map(l => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  lang === l
                    ? 'gradient-primary text-primary-foreground border-transparent'
                    : 'bg-secondary text-foreground border-border hover:border-primary/30'
                }`}
              >
                {langNames[l]}
                {lang === l && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Spiritual identity */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {lang === 'ar' ? 'التوجيه الروحي' : 'Spiritual Guidance'}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {lang === 'ar'
              ? 'عند التفعيل، سيستشهد المرشد بأحاديث صحيحة من قاعدة بيانات محلية موثوقة فقط (البخاري ومسلم). يُمنع برمجياً تأليف أي حديث.'
              : 'When enabled, the guide will only cite authenticated hadiths from a trusted local bank (Bukhari & Muslim). The AI is forbidden from inventing any narration.'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {lang === 'ar' ? 'هل أنت مسلم؟' : 'Are you Muslim?'}
            </span>
            <button
              onClick={handleToggleMuslim}
              role="switch"
              aria-checked={isMuslim}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                isMuslim ? 'bg-primary' : 'bg-secondary border border-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform ${
                  isMuslim ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {isMuslim && !hasHadiths() && (
            <p className="mt-3 text-xs text-warning leading-relaxed">
              {lang === 'ar'
                ? '⏳ قاعدة بيانات الأحاديث قيد الإعداد. الميزة مفعّلة لكن لن تُحقن أحاديث حتى تكتمل.'
                : '⏳ Hadith bank is being prepared. The toggle is on, but no hadiths will be cited until it is filled.'}
            </p>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {lang === 'ar' ? 'التذكيرات اليومية' : 'Daily Reminders'}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {lang === 'ar'
              ? 'تظهر التنبيهات بصيغة سرية ("لديك رسالة جديدة") لحماية خصوصيتك.'
              : 'Notifications appear privately ("New message") to protect your privacy.'}
          </p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground">
              {notifOn
                ? (lang === 'ar' ? 'مفعّلة' : 'Enabled')
                : (lang === 'ar' ? 'متوقفة' : 'Disabled')}
            </span>
            <button
              onClick={handleToggleNotif}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                notifOn
                  ? 'bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20'
                  : 'gradient-primary text-primary-foreground'
              }`}
            >
              {notifOn
                ? (lang === 'ar' ? 'إيقاف' : 'Turn off')
                : (lang === 'ar' ? 'تفعيل' : 'Enable')}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'الوقت' : 'Time'}
            </label>
            <input
              type="time"
              value={notifTime}
              onChange={e => handleTimeChange(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleTestNotif}
              className="text-xs px-3 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/70"
            >
              {lang === 'ar' ? 'اختبار' : 'Test'}
            </button>
          </div>
        </div>

        {/* Local AI status */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            {lang === 'ar' ? 'الذكاء الاصطناعي المحلي' : 'Local AI'}
          </h3>
          <LocalAIStatus />
        </div>

        {/* SOS shortcut */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" />
            {lang === 'ar' ? 'ركن الطوارئ' : 'Emergency Hub'}
          </h3>
          <button
            onClick={() => navigate('/sos')}
            className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium"
          >
            {lang === 'ar' ? 'افتح أدوات الطوارئ' : 'Open emergency tools'}
          </button>
        </div>

        {/* Data sovereignty */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {lang === 'ar' ? 'سيادة البيانات' : 'Data Sovereignty'}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {lang === 'ar'
              ? 'صدّر رحلتك في ملف مشفّر (.sirat) واستوردها على أي جهاز آخر.'
              : 'Export your journey as an encrypted .sirat file and import it on another device.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              disabled={busy}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={handleImportClick}
              disabled={busy}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {lang === 'ar' ? 'استيراد' : 'Import'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sirat,application/octet-stream,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Privacy / wipe */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {lang === 'ar' ? 'الخصوصية' : 'Privacy'}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {lang === 'ar'
              ? 'كل بياناتك مخزّنة على جهازك فقط ومُشفّرة بـ AES-GCM. لا تُرسل إلى أي خادم.'
              : 'All your data lives on this device only, encrypted with AES-GCM. Nothing is sent to any server.'}
          </p>
          <button
            onClick={handleWipe}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {lang === 'ar' ? 'حذف كل بياناتي المحلية' : 'Wipe all my local data'}
          </button>
        </div>

        {/* Legal */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {lang === 'ar' ? 'القانوني' : 'Legal'}
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <span className="text-sm text-foreground">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/disclaimer')}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <span className="text-sm text-foreground">{lang === 'ar' ? 'إخلاء المسؤولية الطبي' : 'Medical Disclaimer'}</span>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Import preview confirmation */}
      <Dialog open={!!importPreview} onOpenChange={(open) => { if (!open) setImportPreview(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {lang === 'ar' ? 'تأكيد الاستيراد' : 'Confirm import'}
            </DialogTitle>
            <DialogDescription>
              {lang === 'ar'
                ? 'سيُستبدل كل محتواك المحلي بالبيانات أدناه. هذه العملية لا يمكن التراجع عنها.'
                : 'Your local content will be REPLACED by the data below. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-2 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary rounded-xl p-3">
                  <div className="text-2xl font-bold text-foreground">{importPreview.preview.messages}</div>
                  <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'رسالة' : 'Messages'}</div>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <div className="text-2xl font-bold text-foreground">{importPreview.preview.entries}</div>
                  <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'يوم مسجّل' : 'Days logged'}</div>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <div className="text-2xl font-bold text-foreground">{importPreview.preview.badges}</div>
                  <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'شارة' : 'Badges'}</div>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <div className="text-2xl font-bold text-foreground">{importPreview.preview.challenges}</div>
                  <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'تحدّي' : 'Challenges'}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {lang === 'ar' ? 'تاريخ التصدير:' : 'Exported:'}{' '}
                {new Date(importPreview.preview.exportedAt).toLocaleString()}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setImportPreview(null)}
              className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
            >
              {lang === 'ar' ? 'استبدال البيانات' : 'Replace data'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
