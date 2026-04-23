import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wind, Heart, MessageCircle, Phone, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import assets from '@/data/motivational-assets.json';

/**
 * Always-offline emergency hub.
 * KPI: page must be ready < 100ms — no network, no async loads, no model.
 */
const SOSPage = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const phrases = (assets as { rejection_phrases: string[] }).rejection_phrases;
  const [quote, setQuote] = useState<string>(() => phrases[Math.floor(Math.random() * phrases.length)]);

  // Breathing animation cycle: 4s in → 4s hold → 6s out (= 14s)
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  useEffect(() => {
    const cycle = () => {
      setPhase('in');
      const t1 = setTimeout(() => setPhase('hold'), 4000);
      const t2 = setTimeout(() => setPhase('out'), 8000);
      const t3 = setTimeout(cycle, 14000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    };
    const stop = cycle();
    return stop;
  }, []);

  const phaseLabel = useMemo(() => {
    if (isAr) return phase === 'in' ? 'شهيق' : phase === 'hold' ? 'احبس' : 'زفير';
    return phase === 'in' ? 'Inhale' : phase === 'hold' ? 'Hold' : 'Exhale';
  }, [phase, isAr]);

  const goEmergencyChat = () => {
    const prompt = isAr
      ? 'أنا على وشك الانتكاسة، ساعدني الآن.'
      : "I'm about to relapse, help me right now.";
    sessionStorage.setItem('sirat-sos-prompt', prompt);
    navigate('/chat');
  };

  return (
    <div className="min-h-[calc(100vh-7.5rem)] px-4 py-6 pb-24 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary"
            aria-label={isAr ? 'رجوع' : 'Back'}
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              {isAr ? 'ركن الطوارئ' : 'Emergency Hub'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'يعمل بدون إنترنت — أنت في مكان آمن.' : 'Works offline — you are safe here.'}
            </p>
          </div>
        </div>

        {/* Breathing exercise */}
        <section className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Wind className="w-4 h-4 text-primary" />
            {isAr ? 'تمرين التنفس' : 'Breathing Exercise'}
          </h2>
          <div className="flex flex-col items-center justify-center py-4">
            <motion.div
              animate={{
                scale: phase === 'in' ? 1.4 : phase === 'hold' ? 1.4 : 0.85,
              }}
              transition={{
                duration: phase === 'in' ? 4 : phase === 'hold' ? 0.1 : 6,
                ease: 'easeInOut',
              }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/40 flex items-center justify-center"
            >
              <span className="text-foreground font-semibold">{phaseLabel}</span>
            </motion.div>
            <p className="text-xs text-muted-foreground mt-4 text-center max-w-[240px] leading-relaxed">
              {isAr
                ? 'شهيق 4 ثوانٍ — حبس 4 ثوانٍ — زفير 6 ثوانٍ. كرر 5 مرات.'
                : 'Inhale 4s — Hold 4s — Exhale 6s. Repeat 5 times.'}
            </p>
          </div>
        </section>

        {/* Motivation bank */}
        <section className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            {isAr ? 'بنك التحفيز' : 'Motivation Bank'}
          </h2>
          <p className="text-foreground text-sm leading-relaxed min-h-[3.5rem]" dir="auto">
            “{quote}”
          </p>
          <button
            onClick={() => setQuote(phrases[Math.floor(Math.random() * phrases.length)])}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
          >
            {isAr ? 'اقتباس آخر' : 'Another quote'}
          </button>
        </section>

        {/* Quick AI chat */}
        <button
          onClick={goEmergencyChat}
          className="w-full flex items-center gap-3 p-4 rounded-2xl gradient-primary text-primary-foreground mb-3 shadow-lg shadow-primary/30 hover:opacity-95 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="text-start">
            <p className="font-semibold text-sm">
              {isAr ? 'تحدّث مع المرشد الآن' : 'Talk to the guide now'}
            </p>
            <p className="text-xs opacity-90">
              {isAr ? 'محادثة فورية بدون انتظار' : 'Instant chat, no wait'}
            </p>
          </div>
        </button>

        {/* Local emergency */}
        <a
          href="tel:112"
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-destructive" />
          </div>
          <div className="text-start">
            <p className="font-semibold text-foreground text-sm">
              {isAr ? 'اتصل بخط الطوارئ المحلي' : 'Call local emergency line'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'سلامتك أولاً ❤️' : 'Your safety comes first ❤️'}
            </p>
          </div>
        </a>
      </motion.div>
    </div>
  );
};

export default SOSPage;
