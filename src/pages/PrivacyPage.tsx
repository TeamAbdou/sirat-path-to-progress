import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
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
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </h1>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 text-sm leading-relaxed text-foreground">
          <p className="text-xs text-muted-foreground">
            {isAr ? 'آخر تحديث: مارس 2026' : 'Last Updated: March 2026'}
          </p>

          <p className="text-muted-foreground">
            {isAr
              ? 'تحرص منصة Sirat على حماية خصوصية مستخدميها، وبخاصة القاصرين. توضح هذه السياسة كيفية جمع البيانات واستخدامها وحمايتها وفقاً للائحة الأوروبية العامة لحماية البيانات (GDPR) وقانون حماية خصوصية الأطفال على الإنترنت الأمريكي (COPPA) وقانون الخدمات الرقمية (DSA).'
              : 'Sirat is committed to protecting the privacy of all users, especially minors. This policy explains our data practices in accordance with GDPR, COPPA, and the EU Digital Services Act (DSA).'}
          </p>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? '1. البيانات التي نجمعها' : '1. Data We Collect'}
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>{isAr ? 'الفئة العمرية فقط (13–15 / 16–17 / 18+) — لا نحتفظ بتاريخ الميلاد الكامل' : 'Age group only (13–15 / 16–17 / 18+) — full date of birth is never stored.'}</li>
              <li>{isAr ? 'البريد الإلكتروني لولي الأمر للمستخدمين الذين تتراوح أعمارهم بين 13 و15 سنة، لأغراض الموافقة والإشعار' : 'Parent/guardian email for users aged 13–15, for consent and notification purposes.'}</li>
              <li>{isAr ? 'الآفات أو العادات التي يختار المستخدم تتبعها — مخزنة بصورة مجهولة الهوية' : 'Self-reported habits chosen by the user for tracking — stored anonymously.'}</li>
              <li>{isAr ? 'ملاحظات المستخدم المرسلة للإدارة — دون ربطها بالهوية الشخصية' : 'Voluntary feedback messages sent to admin — not linked to personal identity.'}</li>
              <li>{isAr ? 'سجلات أمان لحماية النظام من الاختراق — محدودة الوصول' : 'Security logs for system protection — access-restricted.'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? '2. ما لا نجمعه' : '2. Data We Do Not Collect'}
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>{isAr ? 'لا نجمع الاسم الكامل أو رقم الهاتف أو العنوان' : 'We do not collect full name, phone number, or address.'}</li>
              <li>{isAr ? 'لا نخزن بيانات بطاقات الائتمان — تتم معالجة جميع المدفوعات عبر PayPal أو Stripe حصراً' : 'We do not store credit card data — all payments are processed by PayPal or Stripe.'}</li>
              <li>{isAr ? 'لا نربط بيانات التبرع بهوية المستخدم مباشرة' : 'Donation records are not directly linked to user identity.'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? '3. حقوق المستخدم' : '3. User Rights'}
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>{isAr ? 'حق الوصول:' : 'Right of Access:'}</strong> {isAr ? 'يمكنك طلب نسخة من بياناتك في أي وقت.' : 'Request a copy of your data at any time.'}</li>
              <li><strong>{isAr ? 'حق النسيان (GDPR المادة 17):' : 'Right to Erasure (GDPR Art. 17):'}</strong> {isAr ? 'يمكنك حذف حسابك وجميع بياناتك من إعدادات الحساب.' : 'Delete your account and all data via Account Settings.'}</li>
              <li><strong>{isAr ? 'حق التصحيح:' : 'Right to Rectification:'}</strong> {isAr ? 'يمكنك تحديث معلوماتك عبر الإعدادات.' : 'Update your information via Settings.'}</li>
              <li><strong>{isAr ? 'حق الاعتراض:' : 'Right to Object:'}</strong> {isAr ? 'يمكنك رفض معالجة بياناتك لأغراض تحليلية.' : 'Opt out of analytical data processing.'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? '4. حماية بيانات القاصرين' : '4. Minor Protection'}
            </h2>
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2 text-muted-foreground">
              <p className="font-semibold text-foreground">{isAr ? 'المستخدمون بين 13–15 سنة:' : 'Users aged 13–15:'}</p>
              <p>{isAr ? 'لا يُفعَّل حسابهم إلا بعد تأكيد ولي الأمر عبر رسالة بريد إلكتروني رسمية. لا يمكنهم إجراء أي معاملات مالية.' : 'Accounts are inactive until parental consent is confirmed by email. They cannot make any financial transactions.'}</p>
              <p className="font-semibold text-foreground mt-3">{isAr ? 'المستخدمون دون 13 سنة:' : 'Users under 13:'}</p>
              <p>{isAr ? 'لا يُقبل تسجيلهم بأي شكل من الأشكال.' : 'Registration is fully blocked.'}</p>
              <p className="font-semibold text-foreground mt-3">{isAr ? 'المستخدمون دون 18 سنة:' : 'Users under 18:'}</p>
              <p>{isAr ? 'ميزة التبرع معطلة بالكامل.' : 'Donation feature is completely disabled.'}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              {isAr ? '5. مدة الاحتفاظ بالبيانات' : '5. Data Retention'}
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>{isAr ? 'بيانات الحساب النشط: تُحذف فوراً بناءً على طلب المستخدم.' : 'Active account data: deleted immediately upon user request.'}</li>
              <li>{isAr ? 'الحسابات غير النشطة: تُحذف تلقائياً بعد 24 شهراً.' : 'Inactive accounts: automatically deleted after 24 months.'}</li>
              <li>{isAr ? 'سجلات الأمان: تُحتفظ بها لمدة 12 شهراً ثم تُحذف تلقائياً.' : 'Security logs: retained for 12 months, then auto-deleted.'}</li>
            </ul>
          </section>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center">
              {isAr ? 'للتواصل: contact.techma31@gmail.com' : 'Contact: contact.techma31@gmail.com'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPage;
