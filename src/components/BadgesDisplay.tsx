import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { BADGES } from '@/lib/badges';
import { motion } from 'framer-motion';
import { listBadges } from '@/lib/localdb/repository';

const BadgesDisplay = () => {
  const { lang } = useApp();
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const isAr = lang === 'ar';

  useEffect(() => {
    listBadges().then(ids => setEarnedBadges(new Set(ids)));
  }, []);

  return (
    <div className="max-w-md mx-auto mt-6">
      <h3 className="font-semibold text-foreground mb-3 text-sm">
        {isAr ? '🏅 الشارات والإنجازات' : '🏅 Badges & Achievements'}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((badge, i) => {
          const earned = earnedBadges.has(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl p-3 text-center border transition-all ${
                earned
                  ? 'bg-primary/10 border-primary/20 shadow-glow'
                  : 'bg-card border-border opacity-50'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <p className="text-xs font-semibold text-foreground mt-1 leading-tight">
                {isAr ? badge.title.ar : badge.title.en}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isAr ? badge.shortLabel.ar : badge.shortLabel.en}
              </p>
              {earned && (
                <span className="inline-block mt-1 text-[10px] text-primary font-medium">
                  ✓ {isAr ? 'مُكتسبة' : 'Earned'}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesDisplay;
