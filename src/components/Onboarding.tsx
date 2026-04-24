import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Wifi, Heart, ChevronRight } from 'lucide-react';
import { setPreferenceRaw } from '@/lib/localdb/repository';
import { useApp } from '@/contexts/AppContext';

interface Slide {
  icon: typeof Shield;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  tint: string;
}

const SLIDES: Slide[] = [
  {
    icon: Shield,
    titleAr: 'خصوصيتك أولاً — 100%',
    titleEn: 'Your privacy comes first — 100%',
    bodyAr: 'كل بياناتك (الرسائل، التقدم، اليوميات) مخزّنة على جهازك فقط، مشفّرة بـ AES-GCM. لا خوادم، لا حسابات، لا تتبّع.',
    bodyEn: 'Every byte (messages, progress, journal) lives on your device only, encrypted with AES-GCM. No servers, no accounts, no tracking.',
    tint: 'from-primary/20 to-primary/5',
  },
  {
    icon: Wifi,
    titleAr: 'يعمل بالكامل بدون إنترنت',
    titleEn: 'Fully offline by design',
    bodyAr: 'الذكاء الاصطناعي يعمل داخل متصفحك عبر WebGPU. بعد التحميل الأول، لا حاجة للاتصال إطلاقاً.',
    bodyEn: 'The AI runs inside your browser via WebGPU. After the first download, you never need a connection again.',
    tint: 'from-accent/20 to-accent/5',
  },
  {
    icon: Heart,
    titleAr: 'هدفنا إنساني',
    titleEn: 'A human-first mission',
    bodyAr: 'صراط رفيق على الطريق، لا بديل عن طبيب أو معالج نفسي. نحن هنا لنساعدك خطوة بخطوة، بصبر ورحمة.',
    bodyEn: 'Sirat is a companion on the road, not a substitute for a doctor or therapist. We walk with you, step by step, with patience and compassion.',
    tint: 'from-destructive/20 to-destructive/5',
  },
];

interface Props {
  onDone: () => void;
}

const Onboarding = ({ onDone }: Props) => {
  const { lang } = useApp();
  const [idx, setIdx] = useState(0);
  const isAr = lang === 'ar';
  const slide = SLIDES[idx];
  const last = idx === SLIDES.length - 1;
  const Icon = slide.icon;

  const next = async () => {
    if (last) {
      await setPreferenceRaw('onboardingDone', true);
      onDone();
    } else {
      setIdx(i => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-sm w-full text-center space-y-6"
          >
            <div className={`mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.tint} flex items-center justify-center`}>
              <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {isAr ? slide.titleAr : slide.titleEn}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {isAr ? slide.bodyAr : slide.bodyEn}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-4 space-y-5">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-8 bg-primary' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
        >
          {last
            ? (isAr ? 'ابدأ رحلتك' : 'Start your journey')
            : (isAr ? 'التالي' : 'Next')}
          <ChevronRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
        </motion.button>
        {!last && (
          <button
            onClick={async () => { await setPreferenceRaw('onboardingDone', true); onDone(); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isAr ? 'تخطّي' : 'Skip'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
