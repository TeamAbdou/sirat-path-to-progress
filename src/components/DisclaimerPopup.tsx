import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPreferenceRaw, setPreferenceRaw } from '@/lib/localdb/repository';

const KEY = 'disclaimerAccepted';

const DisclaimerPopup = () => {
  const { lang } = useApp();
  const [show, setShow] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    getPreferenceRaw<boolean>(KEY).then(v => {
      if (!v) setShow(true);
    });
  }, []);

  const handleAccept = async () => {
    await setPreferenceRaw(KEY, true);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-[hsl(var(--warning))]" />
              <h2 className="text-lg font-bold text-foreground">
                {isAr ? 'إشعار مهم' : 'Important Notice'}
              </h2>
            </div>

            <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-foreground text-center leading-relaxed">
                {isAr
                  ? 'تطبيق Sirat ليس بديلاً عن التشخيص الطبي أو العلاج النفسي. المحتوى المقدم ذو طابع توعوي وإرشادي فقط. كل بياناتك تبقى على جهازك. في حالة الأزمات النفسية، تواصل فوراً مع مختص.'
                  : 'Sirat is NOT a substitute for medical diagnosis or psychological therapy. All content is for educational and guidance purposes only. All your data stays on this device. In case of mental health crises, contact a professional immediately.'}
              </p>
            </div>

            <button
              onClick={handleAccept}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold transition-all hover:scale-[1.02]"
            >
              {isAr ? 'أفهم وأوافق' : 'I Understand & Accept'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DisclaimerPopup;
