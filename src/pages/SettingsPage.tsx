import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { User, Globe, Check, Shield, AlertTriangle, Trash2, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lang, langNames } from '@/lib/i18n';
import {
  getPreferenceEncrypted,
  setPreferenceEncrypted,
  clearMessages,
} from '@/lib/localdb/repository';
import { db } from '@/lib/localdb/db';
import LocalAIStatus from '@/components/LocalAIStatus';

const SettingsPage = () => {
  const { t, lang, setLang } = useApp();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPreferenceEncrypted('displayName').then(v => {
      if (v) setDisplayName(v);
    });
  }, []);

  const handleSaveName = async () => {
    setSaving(true);
    await setPreferenceEncrypted('displayName', displayName);
    setSaving(false);
    toast.success(t.saved);
  };

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
  };

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
    ]);
    toast.success(lang === 'ar' ? 'تم الحذف' : 'Wiped');
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

        {/* Local AI status */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            {lang === 'ar' ? 'الذكاء الاصطناعي المحلي' : 'Local AI'}
          </h3>
          <LocalAIStatus />
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
    </div>
  );
};

export default SettingsPage;
