import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { challenges } from '@/lib/challenges';
import { supabase } from '@/integrations/supabase/client';
import { Send, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { TranslationKey } from '@/lib/i18n';
import { toast } from 'sonner';
import SOSModal from '@/components/SOSModal';
import QuickReplies from '@/components/QuickReplies';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sirat-chat`;

const ChatPage = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { t, lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const challenge = challenges.find(c => c.id === challengeId);
  const challengeName = challenge ? (t[challenge.id as TranslationKey] as string) : '';

  // Load chat history from DB
  useEffect(() => {
    if (!user || !challengeId || historyLoaded) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      } else {
        setMessages([{ role: 'assistant', content: t.welcomeMessage }]);
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [user, challengeId, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t.welcomeMessage }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user || !challengeId) return;
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      challenge_id: challengeId,
      role,
      content,
    });
  };

  const handleSend = async (overrideInput?: string) => {
    const msgText = overrideInput || input.trim();
    if (!msgText || isLoading) return;
    const userMsg: Message = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowQuickReplies(false);

    // Save user message
    saveMessage('user', userMsg.content);

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

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
        throw new Error('No session');
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          challengeId: challengeId || 'general',
          lang,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error(lang === 'ar' ? 'تم تجاوز حد الطلبات، حاول لاحقًا' : 'Rate limited, please try again later');
        } else if (resp.status === 402) {
          toast.error(lang === 'ar' ? 'يرجى إضافة رصيد للمتابعة' : 'Payment required, please add credits');
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

      // Flush remaining buffer
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

      // Save assistant message
      if (assistantSoFar) {
        saveMessage('assistant', assistantSoFar);
      }
    } catch (e) {
      console.error(e);
      if (!assistantSoFar) {
        setMessages(prev => [...prev, { role: 'assistant', content: t.aiError }]);
      }
    } finally {
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
        {/* SOS Button */}
        <button
          onClick={() => setSosOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold">SOS</span>
        </button>
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

      {/* Quick Reply Chips */}
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
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl gradient-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SOS Modal */}
      <SOSModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
};

export default ChatPage;
