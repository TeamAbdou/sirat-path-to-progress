import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, Wind, X, Heart, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MicButton from '@/components/voice/MicButton';

interface SOSModalProps {
  open: boolean;
  onClose: () => void;
}

const SOSModal = ({ open, onClose }: SOSModalProps) => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-destructive" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {isAr ? 'أنت لست وحدك' : "You're Not Alone"}
                </h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Breathing exercise */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 text-center">
              <Wind className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium mb-1">
                {isAr ? 'تمرين التنفس' : 'Breathing Exercise'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAr
                  ? 'خذ نفساً عميقاً معي الآن: شهيق 4 ثوانٍ — حبس 4 ثوانٍ — زفير 6 ثوانٍ. كرر 5 مرات.'
                  : 'Take a deep breath: Inhale 4 seconds — Hold 4 seconds — Exhale 6 seconds. Repeat 5 times.'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Need help now */}
              <button
                onClick={() => {
                  // Show emergency contacts
                  window.open('tel:112', '_self');
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors text-start"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {isAr ? 'أحتاج مساعدة الآن' : 'I Need Help Now'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? 'اتصل بخط الطوارئ المحلي أو شخص موثوق'
                      : 'Call local emergency line or a trusted person'}
                  </p>
                </div>
              </button>

              {/* Talk to someone */}
              <button
                onClick={() => {
                  onClose();
                  // Open a helpful resource
                  window.open('https://findahelpline.com/', '_blank');
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-start"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {isAr ? 'أريد التحدث مع شخص' : 'I Want to Talk to Someone'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? 'ابحث عن خط دعم بشري في بلدك'
                      : 'Find a human support helpline in your country'}
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-center">
              <MicButton size="sm" />
            </div>

            <button
              onClick={() => { onClose(); navigate('/sos'); }}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {isAr ? 'افتح ركن الطوارئ الكامل' : 'Open Full Emergency Hub'}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
              {isAr
                ? 'أشعر بقلقك الشديد وأهم شيء الآن هو سلامتك. ❤️'
                : "I sense your deep concern and the most important thing now is your safety. ❤️"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SOSModal;
