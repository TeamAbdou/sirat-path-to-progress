import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Shield } from 'lucide-react';

interface GuestSignupModalProps {
  open: boolean;
  onClose: () => void;
}

const GuestSignupModal = ({ open, onClose }: GuestSignupModalProps) => {
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex justify-end mb-2">
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>

              <h3 className="text-xl font-bold text-foreground">
                {isAr ? 'لقد بدأت رحلة رائعة! 🌟' : 'You started a great journey! 🌟'}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'للحفاظ على خصوصية محادثاتك ومتابعة تقدمك في التعافي، يرجى إنشاء حساب مجهول الآن.'
                  : 'To keep your conversations private and track your recovery progress, please create an anonymous account now.'}
              </p>

              <button
                onClick={() => navigate('/auth')}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-5 h-5" />
                {isAr ? 'احفظ تقدمك وسجل حسابك (مجاناً للأبد)' : 'Save your progress & create account (free forever)'}
              </button>

              <p className="text-[11px] text-muted-foreground">
                {isAr ? '🔒 بياناتك مشفرة ومجهولة بالكامل' : '🔒 Your data is fully encrypted and anonymous'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuestSignupModal;
