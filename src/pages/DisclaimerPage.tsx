import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DisclaimerPage = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const isAr = lang === 'ar';

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <BackArrow className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />
            <h1 className="text-2xl font-bold text-foreground">
              {isAr ? 'إخلاء المسؤولية الطبي' : 'Medical Disclaimer'}
            </h1>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 text-sm leading-relaxed text-foreground">
          {/* Important Warning Banner */}
          <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 rounded-xl p-4 text-center">
            <p className="font-bold text-foreground text-base">
              {isAr ? '⚠️ هام جداً — يُرجى قراءة هذا الإشعار قبل استخدام التطبيق' : '⚠️ Important — Please read this notice before using the app'}
            </p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
            <p className="font-semibold text-foreground">
              {isAr
                ? '🔹 Sirat ليس بديلاً عن التشخيص الطبي أو العلاج النفسي أو أي رعاية صحية متخصصة.'
                : '🔹 Sirat is NOT a substitute for medical diagnosis, psychological therapy, or any form of professional healthcare.'}
            </p>
          </div>

          <p className="text-muted-foreground">
            {isAr
              ? 'تطبيق Sirat هو أداة دعم شخصي وتوجيه ذاتي تفاعلية، مصممة لمساعدة المستخدمين على تحسين عاداتهم اليومية. المحتوى المقدم في التطبيق ذو طابع توعوي وإرشادي حصراً، ولا يُعد رأياً طبياً أو نفسياً معتمداً. لا يتحمل مشروع Sirat أو فريق tCorp/tGOOD أي مسؤولية عن قرارات اتُخذت استناداً إلى محتوى التطبيق.'
              : 'Sirat is an interactive personal support and self-guidance tool designed to help users improve their daily habits. All content provided within the application is for informational and educational purposes only. It does not constitute professional medical or psychological advice. Sirat / tCorp / tGOOD assumes no liability for decisions made based on the app\'s content.'}
          </p>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? 'في الحالات التالية:' : 'If you are experiencing:'}
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>{isAr ? 'أزمة نفسية أو أفكار إيذاء الذات' : 'A mental health crisis or thoughts of self-harm'}</li>
              <li>{isAr ? 'اضطرابات نفسية مشخصة أو مشتبه بها' : 'A diagnosed or suspected psychological disorder'}</li>
              <li>{isAr ? 'إدمان يحتاج تدخل طبي' : 'Addiction requiring medical intervention'}</li>
            </ul>
          </section>

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
            <p className="font-bold text-foreground">
              {isAr
                ? '🚨 تواصل فوراً مع طبيب أو مختص نفسي معتمد أو خط الطوارئ في بلدك.'
                : '🚨 Please contact a licensed medical professional, therapist, or your local emergency/crisis helpline immediately.'}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Sirat | صراط — tCorp / tGOOD
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DisclaimerPage;
