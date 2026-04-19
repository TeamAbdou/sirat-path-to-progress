import { useNavigate } from "react-router-dom";
import { Brain, Zap, ShieldCheck, Heart, Syringe, Gamepad2, Check, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(40,33%,98%)] text-[hsl(15,30%,24%)]" dir="rtl" style={{ fontFamily: "'Arimo', sans-serif" }}>
      
      {/* Slide 1: Hero */}
      <section className="relative min-h-screen grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 order-2 md:order-1">
          <h1 className="text-5xl md:text-7xl font-bold text-[hsl(122,45%,33%)] mb-5 leading-tight" style={{ fontFamily: "'Amiri', serif" }}>
            صراط (Sirat)
          </h1>
          <p className="text-xl md:text-2xl text-[hsl(122,65%,23%)] mb-5 font-medium" style={{ fontFamily: "'Azeret Mono', monospace" }}>
            رفيقك الرقمي للتعافي والبناء
          </p>
          <p className="text-lg md:text-xl text-[hsl(15,22%,29%)] leading-relaxed mb-8">
            حل ذكي يجمع بين الدعم النفسي، الوازع التربوي، والحماية القانونية للشباب 24/7.
          </p>
          <div className="w-24 h-1 bg-[hsl(122,45%,33%)] mb-8 rounded-full" />
          <div className="flex flex-col sm:flex-row gap-3 self-start">
            <Button
              onClick={() => navigate("/guest-chat")}
              size="lg"
              className="bg-[hsl(122,45%,33%)] hover:bg-[hsl(122,45%,25%)] text-white text-lg px-10 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
            >
              <MessageCircle className="w-5 h-5" />
              تحدث بسرية (بدون حساب)
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              variant="outline"
              className="border-[hsl(122,45%,33%)] text-[hsl(122,45%,33%)] hover:bg-[hsl(122,45%,33%)]/10 text-lg px-10 py-6 rounded-2xl shadow-lg transition-all duration-300 flex items-center gap-3"
            >
              إنشاء حساب
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="order-1 md:order-2 h-64 md:h-auto">
          <picture>
            <source srcSet="/images/hero-forest.webp" type="image/webp" />
            <img
              src="/images/hero-forest.jpg"
              alt="طريق هادئ يؤدي عبر غابة خضراء نحو ضوء ساطع"
              className="w-full h-full object-cover md:rounded-r-[30px]"
              width={768}
              height={768}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
      </section>

      {/* Slide 2: Tech Stack */}
      <section className="py-20 px-8 md:px-16 bg-[hsl(45,100%,93%)]">
        <h2 className="text-4xl md:text-5xl font-bold text-[hsl(122,45%,33%)] mb-14 text-center" style={{ fontFamily: "'Amiri', serif" }}>
          القوة التقنية (Tech Stack)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { icon: Brain, title: "Gemini 3 Flash", desc: "ذكاء اصطناعي متطور لتحليل المشاعر وتقديم توصيات تربوية دقيقة وسريعة." },
            { icon: Zap, title: "Supabase & Edge", desc: "بنية تحتية سحابية تضمن سرعة استجابة فائقة (أقل من 200ms) وأماناً عالياً." },
            { icon: ShieldCheck, title: "Rate Limiting", desc: "نظام حماية متقدم ضد الهجمات السيبرانية يضمن استقرار الخدمة وخصوصية البيانات." },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-10 text-center border border-[hsl(16,26%,93%)] flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <item.icon className="w-12 h-12 text-[hsl(122,45%,33%)] mb-6" />
              <h3 className="text-2xl font-bold text-[hsl(122,65%,23%)] mb-4">{item.title}</h3>
              <p className="text-base leading-relaxed text-[hsl(15,22%,29%)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Slide 3: Legal & Ethics */}
      <section className="py-20 px-8 md:px-16">
        <h2 className="text-4xl md:text-5xl font-bold text-[hsl(122,45%,33%)] mb-14 text-center" style={{ fontFamily: "'Amiri', serif" }}>
          الهندسة الأخلاقية والقانونية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <ul className="space-y-5">
            {[
              { bold: "الامتثال العالمي:", text: "توافق تام مع قوانين GDPR و COPPA لحماية خصوصية البيانات." },
              { bold: "حماية القاصرين:", text: 'نظام "بوابة العمر" وموافقة ولي الأمر عبر رمز التحقق OTP.' },
              { bold: "إخلاء المسؤولية:", text: "توضيح الحدود الفاصلة بين الدعم التربوي والتدخل الطبي المتخصص." },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-lg text-[hsl(15,22%,29%)] leading-relaxed">
                <Check className="w-6 h-6 text-[hsl(122,45%,33%)] mt-1 shrink-0" />
                <span><strong>{item.bold}</strong> {item.text}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl overflow-hidden shadow-lg h-72 md:h-96">
            <picture>
              <source srcSet="/images/shield-legal.webp" type="image/webp" />
              <img src="/images/shield-legal.jpg" alt="درع رقمي يرمز للأمان" className="w-full h-full object-cover" width={768} height={512} loading="lazy" decoding="async" />
            </picture>
          </div>
        </div>
      </section>

      {/* Slide 4: مرشد صراط */}
      <section className="py-20 px-8 md:px-16 bg-[hsl(45,100%,93%)]">
        <h2 className="text-4xl md:text-5xl font-bold text-[hsl(122,45%,33%)] mb-14 text-center" style={{ fontFamily: "'Amiri', serif" }}>
          نظام "مرشد صراط"
        </h2>
        <div className="max-w-4xl mx-auto space-y-6">
          {[
            { icon: Heart, bold: "نبرة رحيمة:", text: "تفاعل دافئ وغير حاكم لضمان الراحة النفسية للمستخدم." },
            { icon: Syringe, bold: "بروتوكول SOS:", text: "استجابة فورية للأزمات تشمل تمارين التنفس وتوجيه الطوارئ." },
            { icon: Gamepad2, bold: "أدوات التفاعل:", text: "نظام شارات (Gamification) ونصوص رفض جاهزة لتسهيل التواصل." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-6 border border-[hsl(16,26%,93%)] shadow-sm">
              <item.icon className="w-8 h-8 text-[hsl(122,45%,33%)] mt-1 shrink-0" />
              <p className="text-lg text-[hsl(15,22%,29%)] leading-relaxed">
                <strong>{item.bold}</strong> {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Slide 5: Financial Sustainability */}
      <section className="py-20 px-8 md:px-16">
        <h2 className="text-4xl md:text-5xl font-bold text-[hsl(122,45%,33%)] mb-14 text-center" style={{ fontFamily: "'Amiri', serif" }}>
          الاستدامة المالية والخصوصية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
          <div className="flex justify-center">
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-8 border-white shadow-xl">
              <picture>
                <source srcSet="/images/payment-secure.webp" type="image/webp" />
                <img src="/images/payment-secure.jpg" alt="بيئة دفع رقمي آمنة" className="w-full h-full object-cover" width={640} height={640} loading="lazy" decoding="async" />
              </picture>
            </div>
          </div>
          <div className="space-y-6">
            {[
              { bold: "نظام التبرع:", text: "تكامل آمن مع PayPal لدعم استمرارية المشروع وتطويره المستمر." },
              { bold: "الشفافية المطلقة:", text: "فصل كامل بين هوية المستخدم وبيانات الدفع لضمان الخصوصية." },
              { bold: "نموذج مستدام:", text: "الحفاظ على مجانية الخدمات الأساسية مع ضمان أمان المعاملات." },
            ].map((item, i) => (
              <p key={i} className="text-lg text-[hsl(15,22%,29%)] leading-relaxed">
                <strong>{item.bold}</strong> {item.text}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 6: Roadmap */}
      <section className="py-20 px-8 md:px-16 bg-[hsl(45,100%,93%)]">
        <h2 className="text-4xl md:text-5xl font-bold text-[hsl(122,45%,33%)] mb-14 text-center" style={{ fontFamily: "'Amiri', serif" }}>
          خارطة الطريق (Roadmap)
        </h2>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse rounded-2xl overflow-hidden border border-[hsl(210,10%,90%)] shadow-sm">
            <thead>
              <tr className="bg-[hsl(122,45%,33%)] text-white">
                <th className="py-4 px-6 text-right text-lg font-bold">المرحلة</th>
                <th className="py-4 px-6 text-right text-lg font-bold">التوقيت</th>
                <th className="py-4 px-6 text-right text-lg font-bold">المهام الرئيسية</th>
              </tr>
            </thead>
            <tbody>
              {[
                { phase: "الإطلاق الرسمي", time: "غداً 22:00", task: "إطلاق النسخة 1.0 وبدء الحملة الترويجية." },
                { phase: "نموذج IqlaDIM", time: "ماي 2026", task: "تدريب نموذج خاص على البيانات التربوية والأخلاقية." },
                { phase: "تحسين التجربة", time: "مستمر", task: "تطوير الميزات بناءً على ردود فعل المستخدمين." },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-[hsl(210,40%,98%)]" : "bg-white"}>
                  <td className="py-4 px-6 text-base font-bold">{row.phase}</td>
                  <td className="py-4 px-6 text-base">{row.time}</td>
                  <td className="py-4 px-6 text-base">{row.task}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-8 text-center bg-[hsl(122,45%,33%)]">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: "'Amiri', serif" }}>
          ابدأ رحلتك نحو التعافي الآن
        </h2>
        <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
          صراط معك في كل خطوة. سجّل مجاناً وابدأ بالتغيير.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate("/guest-chat")}
            size="lg"
            className="bg-white text-[hsl(122,45%,33%)] hover:bg-white/90 text-lg px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 font-bold flex items-center gap-3 mx-auto"
          >
            <MessageCircle className="w-5 h-5" />
            جرّب المحادثة الآن
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
