import { ShieldCheck } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

/**
 * Persistent privacy badge — reinforces "data never leaves your device".
 * Shown on every page just under the top bar.
 */
const PrivacyBadge = () => {
  const { lang } = useApp();
  const isAr = lang === 'ar';
  return (
    <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-primary/80 bg-primary/5 border-b border-primary/10">
      <ShieldCheck className="w-3 h-3" />
      <span>
        {isAr
          ? 'وضع الأمان مفعّل — لا بيانات تخرج من جهازك'
          : 'Safe Mode active — no data leaves your device'}
      </span>
    </div>
  );
};

export default PrivacyBadge;
