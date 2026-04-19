import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';

const rejectionPhrasesAr = [
  "لا، شكراً. هذا مش طريقي.",
  "لا أريد أضر بصحتي من أجل لحظة.",
  "لا أشارك في أشياء تضر مستقبلي.",
  "خلّوني بعيد عن هذا، مش مرتاح له.",
  "لا أقبل أن أكون جزءاً من هذا.",
  "أنا أختار أن أبتعد عن هذا الطريق.",
];

const rejectionPhrasesEn = [
  "No thanks. This isn't my path.",
  "I don't want to harm my health for a moment.",
  "I don't participate in things that hurt my future.",
  "Keep me out of this, I'm not comfortable.",
  "I choose to stay away from this path.",
  "I have something more important right now.",
];

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  visible: boolean;
}

const QuickReplies = ({ onSelect, visible }: QuickRepliesProps) => {
  const { lang } = useApp();
  const phrases = lang === 'ar' ? rejectionPhrasesAr : rejectionPhrasesEn;

  if (!visible) return null;

  return (
    <div className="px-4 py-2 overflow-x-auto">
      <div className="flex gap-2 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
        {phrases.map((phrase, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(phrase)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-foreground hover:bg-primary/20 transition-colors whitespace-nowrap"
            style={{ scrollSnapAlign: 'start' }}
          >
            {phrase}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickReplies;
