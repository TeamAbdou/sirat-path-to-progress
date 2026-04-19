import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { challenges } from '@/lib/challenges';
import { TranslationKey } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Calendar, Flame, Trophy, CheckCircle, Share2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import BadgesDisplay from '@/components/BadgesDisplay';
import { getProgress, upsertProgress, resetProgress as resetProgressDb } from '@/lib/localdb/repository';

interface ProgressData {
  challenge_id: string;
  days_clean: number;
  current_streak: number;
  best_streak: number;
  tips_followed: number;
  last_marked: string | null;
}

const ProgressPage = () => {
  const { t, lang } = useApp();
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isMarkedToday = progress?.last_marked === today;

  useEffect(() => {
    if (!selectedChallenge) return;
    setLoading(true);
    getProgress(selectedChallenge).then(row => {
      setProgress({
        challenge_id: row.challengeId,
        days_clean: row.daysClean,
        current_streak: row.currentStreak,
        best_streak: row.bestStreak,
        tips_followed: row.tipsFollowed,
        last_marked: row.lastMarked,
      });
      setLoading(false);
    });
  }, [selectedChallenge]);

  const markToday = async () => {
    if (!selectedChallenge || isMarkedToday || !progress) return;
    const newStreak = progress.current_streak + 1;
    const updated = {
      ...progress,
      days_clean: progress.days_clean + 1,
      current_streak: newStreak,
      best_streak: Math.max(progress.best_streak, newStreak),
      tips_followed: progress.tips_followed + 1,
      last_marked: today,
    };
    setProgress(updated);
    await upsertProgress({
      challengeId: selectedChallenge,
      daysClean: updated.days_clean,
      currentStreak: updated.current_streak,
      bestStreak: updated.best_streak,
      tipsFollowed: updated.tips_followed,
      lastMarked: updated.last_marked,
    });
    toast.success(lang === 'ar' ? 'أحسنت! تم تسجيل يومك ✓' : 'Great job! Day marked ✓');
  };

  const resetProgress = async () => {
    if (!selectedChallenge) return;
    await resetProgressDb(selectedChallenge);
    setProgress({
      challenge_id: selectedChallenge,
      days_clean: 0,
      current_streak: 0,
      best_streak: 0,
      tips_followed: 0,
      last_marked: null,
    });
  };

  const shareProgress = () => {
    if (!progress) return;
    const emoji = progress.current_streak >= 30 ? '🏆' : progress.current_streak >= 7 ? '🔥' : '⭐';
    const text = `${emoji} ${progress.current_streak} days streak on Sirat!`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(lang === 'ar' ? 'تم النسخ!' : 'Copied!');
    }
  };

  if (!selectedChallenge) {
    return (
      <div className="container mx-auto px-4 py-8 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground text-center mb-4"
        >
          {t.progress}
        </motion.h2>
        <p className="text-center text-muted-foreground mb-6">{t.selectChallenge}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {challenges.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedChallenge(c.id)}
              className={`rounded-2xl p-4 text-start bg-gradient-to-br ${c.color} border border-border hover:shadow-glow transition-shadow`}
            >
              <c.icon className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-foreground">{t[c.id as TranslationKey] as string}</p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (loading || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const motivationIndex = progress.days_clean % t.motivations.length;
  const motivation = t.motivations[motivationIndex];

  const stats = [
    { label: t.daysClean, value: progress.days_clean, icon: Calendar, color: 'text-primary' },
    { label: t.currentStreak, value: progress.current_streak, icon: Flame, color: 'text-accent' },
    { label: t.bestStreak, value: progress.best_streak, icon: Trophy, color: 'text-accent' },
    { label: t.tipsFollowed, value: progress.tips_followed, icon: CheckCircle, color: 'text-primary' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setSelectedChallenge(null)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          {lang === 'ar' ? '→' : '←'}
        </button>
        <h2 className="text-2xl font-bold text-foreground text-center">
          {t[selectedChallenge as TranslationKey] as string}
        </h2>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 text-center"
          >
            <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-md mx-auto mb-6 bg-card border border-border rounded-2xl p-5 text-center"
      >
        <p className="text-sm text-muted-foreground mb-2">{t.dailyMotivation}</p>
        <p className="text-lg font-medium text-foreground">{motivation}</p>
      </motion.div>

      <BadgesDisplay />

      <div className="flex flex-col gap-3 max-w-md mx-auto mt-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={markToday}
          disabled={isMarkedToday}
          className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
            isMarkedToday
              ? 'bg-secondary text-muted-foreground'
              : 'gradient-primary text-primary-foreground shadow-glow'
          }`}
        >
          {isMarkedToday ? t.todayMarked : t.markToday}
        </motion.button>

        <div className="flex gap-3">
          <button
            onClick={shareProgress}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary text-secondary-foreground font-medium"
          >
            <Share2 className="w-4 h-4" />
            {t.shareProgress}
          </button>
          <button
            onClick={resetProgress}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-secondary text-muted-foreground font-medium"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
