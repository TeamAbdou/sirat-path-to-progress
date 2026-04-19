import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { User, Lock, Globe, Eye, EyeOff, Check, ShieldCheck, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lang, langNames } from '@/lib/i18n';
import { strongPasswordSchema, getPasswordStrength, getPasswordStrengthAr } from '@/lib/passwordValidation';
import { logSecurityEvent } from '@/lib/securityLogger';

const SettingsPage = () => {
  const { t, lang, setLang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordValidation = newPassword ? strongPasswordSchema.safeParse(newPassword) : null;

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
        });
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.saved);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    // Validate strong password
    const result = strongPasswordSchema.safeParse(newPassword);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      logSecurityEvent({
        eventType: 'password_changed',
        description: 'Password changed successfully',
      });
      toast.success(t.saved);
      setNewPassword('');
    }
  };

  const handleLangChange = async (newLang: Lang) => {
    setLang(newLang);
    if (user) {
      await supabase
        .from('profiles')
        .update({ lang: newLang })
        .eq('id', user.id);
    }
  };

  const handleSignOutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      toast.error(error.message);
    } else {
      logSecurityEvent({
        eventType: 'logout',
        description: 'Signed out from all devices',
      });
      toast.success(lang === 'ar' ? 'تم تسجيل الخروج من جميع الأجهزة' : 'Signed out from all devices');
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

        {/* Change Password with strength indicator */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {t.changePassword}
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={lang === 'ar' ? 'كلمة مرور قوية (12 حرف على الأقل)' : 'Strong password (min 12 chars)'}
                className="w-full px-4 pe-10 py-2.5 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2.5 end-3 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-all"
                      style={{
                        backgroundColor: i <= passwordStrength.score - 1
                          ? passwordStrength.color
                          : 'hsl(var(--secondary))',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: passwordStrength.color }}>
                  {lang === 'ar' ? getPasswordStrengthAr(passwordStrength.label) : passwordStrength.label}
                </p>
                {passwordValidation && !passwordValidation.success && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {passwordValidation.error.errors.map((err, i) => (
                      <li key={i} className="text-destructive">• {err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !passwordValidation?.success}
              className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {t.changePassword}
            </button>
          </form>
        </div>

        {/* Security: Sign out all devices */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {lang === 'ar' ? 'الأمان' : 'Security'}
          </h3>
          <button
            onClick={handleSignOutAll}
            className="w-full py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            {lang === 'ar' ? 'تسجيل الخروج من جميع الأجهزة' : 'Sign out from all devices'}
          </button>
        </div>
        {/* Legal Links */}
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
