import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Send, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import SOSModal from '@/components/SOSModal';
import GuestSignupModal from '@/components/GuestSignupModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GUEST_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sirat-chat`;
const MAX_GUEST_MESSAGES = 3;
const GUEST_MESSAGES_KEY = 'sirat-guest-messages';
const GUEST_COUNT_KEY = 'sirat-guest-msg-count';

const GuestChatPage = () => {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t.welcomeMessage },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [guestMsgCount, setGuestMsgCount] = useState(() => {
    return parseInt(sessionStorage.getItem(GUEST_COUNT_KEY) || '0', 10);
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLimitReached = guestMsgCount >= MAX_GUEST_MESSAGES;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Persist guest messages for migration after signup
  const persistGuestMessages = (msgs: Message[]) => {
    try {
      localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(msgs));
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    const msgText = input.trim();
    if (!msgText || isLoading) return;

    if (isLimitReached) {
      setShowSignupModal(true);
      return;
    }

    const newCount = guestMsgCount + 1;
    setGuestMsgCount(newCount);
    sessionStorage.setItem(GUEST_COUNT_KEY, String(newCount));

    const userMsg: Message = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const apiMessages = newMessages
        .filter((_, i) => i > 0 || newMessages[0].role === 'user')
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(GUEST_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          challengeId: 'general',
          lang,
          guest: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error(isAr ? 'تم تجاوز حد الطلبات، حاول لاحقًا' : 'Rate limited, try again later');
        }
        throw new Error('Request failed');
      }

      if (!resp.body) throw new Error('No body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // Persist for migration
      const finalMessages = [...newMessages];
      if (assistantSoFar) finalMessages.push({ role: 'assistant', content: assistantSoFar });
      persistGuestMessages(finalMessages);

      // Show signup modal after limit reached
      if (newCount >= MAX_GUEST_MESSAGES) {
        setTimeout(() => setShowSignupModal(true), 1500);
      }
    } catch (e) {
      console.error(e);
      if (!assistantSoFar) {
        setMessages(prev => [...prev, { role: 'assistant', content: t.aiError }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <BackArrow className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">
            {isAr ? 'مرشد صراط' : 'Sirat Guide'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isAr ? `مساحة آمنة • ${MAX_GUEST_MESSAGES - guestMsgCount} رسائل تجريبية قبل الانطلاق` : `Safe space • ${MAX_GUEST_MESSAGES - guestMsgCount} trial messages before takeoff`}
          </p>
        </div>
        <button
          onClick={() => setSosOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold">SOS</span>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border text-card-foreground rounded-bl-sm'
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none text-inherit">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && !messages[messages.length - 1]?.content && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {t.aiThinking}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        {isLimitReached ? (
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
          >
            {isAr ? '🔓 سجّل لمتابعة المحادثة' : '🔓 Sign up to continue'}
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t.typeMessage}
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
              dir="auto"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-xl gradient-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <SOSModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <GuestSignupModal open={showSignupModal} onClose={() => setShowSignupModal(false)} />
    </div>
  );
};

export default GuestChatPage;
