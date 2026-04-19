import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ExternalLink, Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const PRESET_AMOUNTS = [1, 5, 10, 25];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 500;

const DonatePage = () => {
  const { t, lang } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donationStatus, setDonationStatus] = useState<'idle' | 'success' | 'failed' | 'cancelled'>('idle');

  const currentAmount = isCustom ? Number(customAmount) : selectedAmount;
  const isValidAmount = currentAmount !== null && !isNaN(currentAmount) && currentAmount >= MIN_AMOUNT && currentAmount <= MAX_AMOUNT;

  // Check URL params for return from PayPal
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setDonationStatus('success');
    } else if (status === 'cancelled') {
      setDonationStatus('cancelled');
    }
  }, [searchParams]);

  // Listen for realtime donation updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('donation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'completed') {
            setDonationStatus('success');
            toast.success(lang === 'ar' ? 'تم التبرع بنجاح! جزاك الله خيراً 🤲' : 'Donation successful! Thank you 🤲');
          } else if (newStatus === 'failed') {
            setDonationStatus('failed');
            toast.error(lang === 'ar' ? 'فشل التبرع. حاول مرة أخرى.' : 'Donation failed. Please try again.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, lang]);

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomInput = (val: string) => {
    // Allow only numbers and decimal
    if (val && !/^\d*\.?\d{0,2}$/.test(val)) return;
    setCustomAmount(val);
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const handleDonate = async () => {
    if (!isValidAmount || loading) return;

    setLoading(true);
    setDonationStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          amount: currentAmount,
          currency: 'USD',
          return_url: `${window.location.origin}/donate?status=success`,
          cancel_url: `${window.location.origin}/donate?status=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.approvalUrl) {
        // Store order ID for matching
        localStorage.setItem('sirat-pending-order', data.orderId);
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL returned');
      }
    } catch (err: any) {
      console.error('Donation error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.');
      setDonationStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary-foreground" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">{t.donate}</h2>
        <p className="text-muted-foreground mb-6">{t.donateDesc}</p>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {donationStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 mb-6"
            >
              <CheckCircle className="w-6 h-6 text-[hsl(var(--success))] flex-shrink-0" />
              <p className="text-sm text-foreground font-medium text-start">
                {lang === 'ar' ? 'تم التبرع بنجاح! جزاك الله خيراً 🤲' : 'Donation successful! Thank you for your generosity 🤲'}
              </p>
            </motion.div>
          )}
          {donationStatus === 'failed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 mb-6"
            >
              <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
              <p className="text-sm text-foreground font-medium text-start">
                {lang === 'ar' ? 'فشل التبرع. يرجى المحاولة مرة أخرى.' : 'Donation failed. Please try again.'}
              </p>
            </motion.div>
          )}
          {donationStatus === 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 mb-6"
            >
              <XCircle className="w-6 h-6 text-[hsl(var(--warning))] flex-shrink-0" />
              <p className="text-sm text-foreground font-medium text-start">
                {lang === 'ar' ? 'تم إلغاء التبرع.' : 'Donation was cancelled.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transparency card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-start">
          <p className="text-xs text-muted-foreground mb-1">{t.developedBy}</p>
          <p className="font-bold text-foreground text-lg">tGOOD</p>
          <p className="text-xs text-muted-foreground mb-3">
            {lang === 'ar'
              ? 'منظمة غير ربحية تابعة لـ tCorp'
              : 'A non-profit organization, subsidiary of tCorp'}
          </p>
          <div className="h-px bg-border my-3" />
          <h3 className="font-semibold text-foreground mb-2">{t.donateHonesty}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.donateHonestyDesc}</p>
        </div>

        {/* Amount selection */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4 text-start">
            {lang === 'ar' ? 'اختر مبلغ التبرع:' : 'Choose donation amount:'}
          </h3>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handlePresetSelect(amount)}
                className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedAmount === amount && !isCustom
                    ? 'gradient-primary text-primary-foreground shadow-glow scale-105'
                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {lang === 'ar' ? 'أو' : 'or'}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Custom amount */}
          <div className="relative">
            <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => handleCustomInput(e.target.value)}
              placeholder={lang === 'ar' ? 'مبلغ آخر...' : 'Custom amount...'}
              className={`w-full ps-9 pe-16 py-3 bg-secondary border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 ${
                isCustom && customAmount && !isValidAmount ? 'border-destructive' : 'border-border'
              }`}
              dir="ltr"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USD</span>
          </div>
          {isCustom && customAmount && !isValidAmount && (
            <p className="text-xs text-destructive mt-1 text-start">
              {lang === 'ar' ? `المبلغ يجب أن يكون بين $${MIN_AMOUNT} و $${MAX_AMOUNT}` : `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}`}
            </p>
          )}
        </div>

        {/* Donate button */}
        <button
          onClick={handleDonate}
          disabled={!isValidAmount || loading}
          className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl gradient-primary text-primary-foreground font-semibold text-lg shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {lang === 'ar' ? 'جارٍ المعالجة...' : 'Processing...'}
            </>
          ) : (
            <>
              {t.donateNow}
              {isValidAmount && <span className="text-primary-foreground/80">(${currentAmount})</span>}
              <ExternalLink className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-4">{t.donateNote}</p>
      </motion.div>
    </div>
  );
};

export default DonatePage;
