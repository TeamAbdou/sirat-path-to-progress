import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ContactPage = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ validated: boolean; reason: string } | null>(null);

  const t = {
    title: lang === 'ar' ? 'تواصل معنا' : lang === 'fr' ? 'Contactez-nous' : 'Contact Us',
    subtitle: lang === 'ar' ? 'أرسل ملاحظاتك واقتراحاتك' : lang === 'fr' ? 'Envoyez vos remarques et suggestions' : 'Send your feedback and suggestions',
    name: lang === 'ar' ? 'الاسم' : lang === 'fr' ? 'Nom' : 'Name',
    email: lang === 'ar' ? 'البريد الإلكتروني' : lang === 'fr' ? 'E-mail' : 'Email',
    message: lang === 'ar' ? 'رسالتك' : lang === 'fr' ? 'Votre message' : 'Your message',
    send: lang === 'ar' ? 'إرسال' : lang === 'fr' ? 'Envoyer' : 'Send',
    sending: lang === 'ar' ? 'جاري الإرسال...' : lang === 'fr' ? 'Envoi...' : 'Sending...',
    success: lang === 'ar' ? 'تم إرسال رسالتك بنجاح! شكراً لملاحظاتك.' : lang === 'fr' ? 'Votre message a été envoyé avec succès !' : 'Your message was sent successfully! Thanks for your feedback.',
    rejected: lang === 'ar' ? 'لم يتم قبول الرسالة.' : lang === 'fr' ? 'Le message n\'a pas été accepté.' : 'Message was not accepted.',
    error: lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : lang === 'fr' ? 'Une erreur est survenue, réessayez' : 'An error occurred, try again',
    placeholder: lang === 'ar' ? 'اكتب ملاحظاتك أو اقتراحاتك هنا...' : lang === 'fr' ? 'Écrivez vos remarques ici...' : 'Write your feedback or suggestions here...',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-contact', {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      });

      if (error) throw error;

      if (data.validated) {
        setResult({ validated: true, reason: data.reason });
        setName('');
        setEmail('');
        setMessage('');
        toast({ title: t.success });
      } else {
        setResult({ validated: false, reason: data.reason });
      }
    } catch {
      toast({ title: t.error, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'رسالتك ستمر عبر تحقق ذكي للتأكد من أنها مفيدة' : 'Your message will be AI-validated before submission'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t.name}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t.message}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder={t.placeholder}
              required
              maxLength={1000}
            />
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-start gap-3 p-4 rounded-xl ${
                result.validated ? 'bg-primary/10 border border-primary/20' : 'bg-destructive/10 border border-destructive/20'
              }`}
            >
              {result.validated ? (
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {result.validated ? t.success : t.rejected}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{result.reason}</p>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim() || !message.trim()}
            className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? t.sending : t.send}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ContactPage;
