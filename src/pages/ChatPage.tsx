import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { challenges } from '@/lib/challenges';
import { Send, Square, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { TranslationKey } from '@/lib/i18n';
import { toast } from 'sonner';
import SOSModal from '@/components/SOSModal';
import QuickReplies from '@/components/QuickReplies';
import LocalAIStatus from '@/components/LocalAIStatus';
import { addMessage, listMessages } from '@/lib/localdb/repository';
import { streamChat, ensureEngine, isWebGPUAvailable } from '@/lib/llm/engine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatPage = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const challenge = challenges.find(c => c.id === challengeId);
  const challengeName = challenge ? (t[challenge.id as TranslationKey] as string) : '';
  const cid = challengeId || 'general';

  // Load chat history from local DB
  useEffect(() => {
    if (historyLoaded) return;
    listMessages(cid, 50).then(rows => {
      if (rows.length > 0) {
        setMessages(rows.map(r => ({ role: r.role, content: r.content })));
      } else {
        setMessages([{ role: 'assistant', content: t.welcomeMessage }]);
      }
      setHistoryLoaded(true);
    });
  }, [cid, historyLoaded, t.welcomeMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendingRef = useRef(false);

  const handleSend = async (overrideInput?: string) => {
    const msgText = overrideInput || input.trim();
    if (!msgText || isLoading || sendingRef.current) return;
    sendingRef.current = true;

    if (!isWebGPUAvailable()) {
      toast.error(lang === 'ar'
        ? 'متصفحك لا يدعم WebGPU. لا يمكن تشغيل الذكاء الاصطناعي محلياً.'
        : 'Your browser does not support WebGPU. Local AI is unavailable.');
      return;
    }

    const userMsg: Message = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowQuickReplies(false);

    // Persist user message immediately
    addMessage(cid, 'user', userMsg.content).catch(console.error);

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
      // Make sure the engine is loaded (will trigger UI status indicator)
      await ensureEngine();

      // History excluding the initial canned greeting
      const apiMessages = newMessages
        .filter((m, i) => !(i === 0 && m.role === 'assistant' && m.content === t.welcomeMessage))
        .map(m => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;
      await streamChat({
        messages: apiMessages,
        onDelta: upsertAssistant,
        signal: controller.signal,
      });

      if (assistantSoFar) {
        addMessage(cid, 'assistant', assistantSoFar).catch(console.error);
      }
    } catch (e) {
      console.error(e);
      if (!assistantSoFar) {
        setMessages(prev => [...prev, { role: 'assistant', content: t.aiError }]);
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setShowQuickReplies(true);
    }
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <BackArrow className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{challengeName}</h2>
          <p className="text-xs text-muted-foreground">{t.chat}</p>
        </div>
        <button
          onClick={() => setSosOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold">SOS</span>
        </button>
      </div>

      <div className="px-4 pt-3">
        <LocalAIStatus />
      </div>

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

      <QuickReplies
        visible={showQuickReplies && !isLoading}
        onSelect={(text) => handleSend(text)}
      />

      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t.typeMessage}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            dir="auto"
          />
          {isLoading ? (
            <button
              onClick={handleStop}
              className="p-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              aria-label={lang === 'ar' ? 'إيقاف' : 'Stop'}
              title={lang === 'ar' ? 'إيقاف التوليد' : 'Stop generating'}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 rounded-xl gradient-primary text-primary-foreground disabled:opacity-40 transition-opacity"
              aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <SOSModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
};

export default ChatPage;
