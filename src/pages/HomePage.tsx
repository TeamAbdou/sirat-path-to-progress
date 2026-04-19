import { useApp } from '@/contexts/AppContext';
import { challenges, ChallengeId } from '@/lib/challenges';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TranslationKey } from '@/lib/i18n';
import { Download, Shield, MessageSquareText } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useAdmin } from '@/hooks/useAdmin';
import heroIllustration from '@/assets/hero-illustration.png';

const HomePage = () => {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { isAdmin } = useAdmin();

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mb-6 rounded-3xl overflow-hidden"
      >
        <img
          src={heroIllustration}
          alt="Sirat - Your Journey"
          className="w-full h-44 object-cover rounded-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent rounded-3xl" />
        <div className="absolute bottom-4 start-5 end-5">
          <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">
            {t.appName} / Sirat
          </h1>
          <p className="text-sm text-foreground/80 mt-1 drop-shadow">
            {t.tagline}
          </p>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        {canInstall && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={install}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm shadow-glow"
          >
            <Download className="w-4 h-4" />
            {lang === 'ar' ? 'تحميل التطبيق' : 'Install App'}
          </motion.button>
        )}
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm"
          >
            <Shield className="w-4 h-4 text-primary" />
            {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </motion.button>
        )}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/contact')}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm"
        >
          <MessageSquareText className="w-4 h-4 text-primary" />
          {lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </motion.button>
      </div>

      {/* Section Title */}
      <p className="text-foreground/70 font-semibold text-sm mb-4 px-1">
        {t.chooseChallenge}
      </p>

      {/* Challenge Grid */}
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {challenges.map((c, i) => {
          const nameKey = c.id as TranslationKey;
          const descKey = `${c.id}Desc` as TranslationKey;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="relative overflow-hidden rounded-2xl p-4 text-center bg-card border border-border hover:shadow-glow transition-all group"
            >
              <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <c.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {t[nameKey] as string}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                {t[descKey] as string}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
