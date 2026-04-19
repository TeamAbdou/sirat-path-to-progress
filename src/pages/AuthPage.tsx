import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { logSecurityEvent } from '@/lib/securityLogger';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';

type AgeGroup = '13-15' | '16-17' | '18+';

const AuthPage = () => {
  const { t, lang } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('');
  const [parentEmail, setParentEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const isMinor = ageGroup === '13-15';
  const isAr = lang === 'ar';

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setOauthLoading(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(isAr ? 'أدخل بريدك الإلكتروني' : 'Enter your email');
      return;
    }

    const { allowed, remainingMinutes } = await checkRateLimit(email, 'password_reset');
    if (!allowed) {
      toast.error(
        isAr
          ? `تم تجاوز عدد المحاولات. حاول بعد ${remainingMinutes} دقيقة`
          : `Too many attempts. Try again in ${remainingMinutes} minutes`
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        await recordFailedAttempt(email, 'password_reset');
        throw error;
      }
      logSecurityEvent({
        eventType: 'password_reset_request',
        description: `Password reset requested for ${email}`,
        metadata: { email },
      });
      toast.success(
        isAr
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك'
          : 'Password reset link sent to your email'
      );
      setForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { allowed, remainingMinutes } = await checkRateLimit(email, 'login');
        if (!allowed) {
          setRateLimited(true);
          toast.error(
            isAr
              ? `تم حظر تسجيل الدخول مؤقتاً. حاول بعد ${remainingMinutes} دقيقة`
              : `Login temporarily blocked. Try again in ${remainingMinutes} minutes`
          );
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          await recordFailedAttempt(email, 'login');
          logSecurityEvent({
            eventType: 'login_failed',
            description: `Failed login attempt for ${email}`,
            metadata: { email, error: error.message },
          });
          throw error;
        }
        setRateLimited(false);
        logSecurityEvent({
          eventType: 'login_success',
          description: `User logged in: ${email}`,
          userId: data.user?.id,
        });
        toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
      } else {
        // Signup flow
        if (!ageGroup) {
          toast.error(isAr ? 'يرجى اختيار الفئة العمرية' : 'Please select your age group');
          setLoading(false);
          return;
        }
        if (isMinor && !parentEmail) {
          toast.error(isAr ? 'يرجى إدخال بريد ولي الأمر' : 'Please enter parent/guardian email');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              age_group: ageGroup,
              parent_email: isMinor ? parentEmail : null,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.user) {
          // Update profile with age group and parent email
          await supabase.from('profiles').update({
            age_group: ageGroup,
            parent_email: isMinor ? parentEmail : null,
          }).eq('id', data.user.id);

          logSecurityEvent({
            eventType: 'signup',
            description: `New signup: ${email} (age: ${ageGroup})`,
            userId: data.user.id,
          });
        }

        if (isMinor) {
          toast.success(
            isAr
              ? 'تم إنشاء الحساب! سيتم إرسال رسالة موافقة لولي الأمر. الحساب غير مفعّل حتى تأكيد ولي الأمر.'
              : 'Account created! A consent email will be sent to your parent/guardian. Account is inactive until parental approval.'
          );
        } else {
          toast.success(
            isAr
              ? 'تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد'
              : 'Account created! Check your email for confirmation'
          );
        }
      }
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">{t.appName}</h1>
          <p className="text-muted-foreground">{t.tagline}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {/* Rate limit warning */}
          {rateLimited && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <ShieldAlert className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">
                {isAr
                  ? 'تم حظر تسجيل الدخول مؤقتاً بسبب كثرة المحاولات الفاشلة'
                  : 'Login temporarily blocked due to too many failed attempts'}
              </p>
            </div>
          )}

          <div className="flex mb-6 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                isLogin ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t.login}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !isLogin ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t.signup}
            </button>
          </div>

          <form onSubmit={forgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            {!isLogin && !forgotPassword && (
              <>
                <div className="relative">
                  <User className="absolute top-3 start-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder={t.displayName}
                    className="w-full ps-10 pe-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    dir="auto"
                  />
                </div>

                {/* Age Group Selection */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {isAr ? 'الفئة العمرية *' : 'Age Group *'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['13-15', '16-17', '18+'] as AgeGroup[]).map(ag => (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => setAgeGroup(ag)}
                        className={`py-2 rounded-xl text-sm font-medium transition-all border ${
                          ageGroup === ag
                            ? 'gradient-primary text-primary-foreground border-transparent'
                            : 'bg-secondary text-foreground border-border'
                        }`}
                      >
                        {ag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parent Email for minors (13-15) */}
                {isMinor && (
                  <div className="relative">
                    <Users className="absolute top-3 start-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      placeholder={isAr ? 'بريد ولي الأمر *' : 'Parent/Guardian Email *'}
                      required
                      className="w-full ps-10 pe-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isAr
                        ? '⚠️ لن يُفعَّل حسابك إلا بعد تأكيد ولي الأمر'
                        : '⚠️ Your account will be inactive until parental consent is confirmed'}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="relative">
              <Mail className="absolute top-3 start-3 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.email}
                required
                className="w-full ps-10 pe-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
            </div>

            {!forgotPassword && (
              <div className="relative">
                <Lock className="absolute top-3 start-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.password}
                  required
                  minLength={6}
                  className="w-full ps-10 pe-10 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 end-3 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || rateLimited}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold disabled:opacity-50 transition-opacity"
            >
              {loading
                ? (isAr ? 'جارٍ...' : 'Loading...')
                : forgotPassword
                  ? (isAr ? 'إرسال رابط الاستعادة' : 'Send Reset Link')
                  : isLogin
                    ? t.login
                    : t.signup}
            </button>
          </form>

          {!forgotPassword && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{isAr ? 'أو' : 'or'}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={() => handleOAuthSignIn('google')}
                disabled={!!oauthLoading}
                className="w-full py-3 rounded-xl bg-secondary border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {oauthLoading === 'google'
                  ? (isAr ? 'جارٍ...' : 'Loading...')
                  : (isAr ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google')}
              </button>

              <button
                onClick={() => handleOAuthSignIn('apple')}
                disabled={!!oauthLoading}
                className="w-full mt-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {oauthLoading === 'apple'
                  ? (isAr ? 'جارٍ...' : 'Loading...')
                  : (isAr ? 'تسجيل الدخول بحساب Apple' : 'Sign in with Apple')}
              </button>
            </>
          )}

          {isLogin && !forgotPassword && (
            <button
              onClick={() => setForgotPassword(true)}
              className="w-full text-center text-sm text-primary mt-3 hover:underline"
            >
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </button>
          )}

          {forgotPassword && (
            <button
              onClick={() => setForgotPassword(false)}
              className="w-full text-center text-sm text-muted-foreground mt-3 hover:underline"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Back to login'}
            </button>
          )}
        </div>

        {/* Legal links */}
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <a href="/privacy" className="hover:text-primary transition-colors">
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>
          <span>•</span>
          <a href="/disclaimer" className="hover:text-primary transition-colors">
            {isAr ? 'إخلاء المسؤولية' : 'Disclaimer'}
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
