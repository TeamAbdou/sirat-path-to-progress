import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, CheckCircle2, CircleDot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { startVoiceSession, type VoiceSession } from '@/lib/voice/processor';
import Waveform from './Waveform';

interface MicButtonProps {
  /** Called once a transcript is available from the (future) local STT engine. */
  onVoiceTranscript?: (text: string) => void;
  /** Optional override label shown under the button. */
  hint?: string;
  size?: 'sm' | 'md';
  /** When true, only the button + pulse render (no waveform / hint text). */
  inline?: boolean;
}

type Status = 'idle' | 'starting' | 'recording' | 'processing' | 'done';

/**
 * Voice-ready UI scaffold.
 *
 * Today: captures audio locally + shows a live waveform + clear status indicator.
 * Tomorrow: hand the captured Float32 buffer to the lean tAI multimodal engine,
 *           then call `onVoiceTranscript(text)`.
 */
const MicButton = ({ onVoiceTranscript, hint, size = 'md', inline = false }: MicButtonProps) => {
  const { lang } = useApp();
  const isAr = lang === 'ar';
  const [status, setStatus] = useState<Status>('idle');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const sessionRef = useRef<VoiceSession | null>(null);
  const startedAtRef = useRef<number>(0);

  const dim = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const recording = status === 'recording';
  const busy = status === 'starting' || status === 'processing';

  // Timer while recording.
  useEffect(() => {
    if (status !== 'recording') return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  // Auto-clear "done" badge.
  useEffect(() => {
    if (status !== 'done') return;
    const id = window.setTimeout(() => setStatus('idle'), 1800);
    return () => window.clearTimeout(id);
  }, [status]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const start = async () => {
    if (status !== 'idle' && status !== 'done') return;
    setStatus('starting');
    try {
      const session = await startVoiceSession();
      sessionRef.current = session;
      setAnalyser(session.analyser);
      setStatus('recording');
    } catch (e) {
      const code = (e as Error).message;
      setStatus('idle');
      toast.error(
        code === 'mic-unsupported'
          ? isAr
            ? 'متصفحك لا يدعم الميكروفون.'
            : 'Microphone not supported in this browser.'
          : isAr
            ? 'تم رفض إذن الميكروفون.'
            : 'Microphone permission denied.',
      );
    }
  };

  const stop = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setAnalyser(null);
    if (!session) {
      setStatus('idle');
      return;
    }
    setStatus('processing');
    try {
      const buffer = await session.stop();
      // TODO(tAI): run buffer through the lean local multimodal engine.
      void buffer;
      if (onVoiceTranscript) {
        onVoiceTranscript('');
      }
      setStatus('done');
      toast.message(
        isAr
          ? 'تم الاستماع — محرك tAI المحلي قيد التحضير.'
          : 'Captured — local tAI engine coming soon.',
      );
    } catch {
      setStatus('idle');
    }
  };

  const toggle = () => (recording ? stop() : start());

  // Status pill text + icon.
  const statusLabel = (() => {
    switch (status) {
      case 'starting':
        return isAr ? 'جارٍ تهيئة الميكروفون…' : 'Initialising mic…';
      case 'recording':
        return isAr ? `يسجّل · ${fmt(elapsed)}` : `Recording · ${fmt(elapsed)}`;
      case 'processing':
        return isAr ? 'جارٍ الإرسال إلى tAI…' : 'Sending to tAI…';
      case 'done':
        return isAr ? 'تم الاستلام محلياً' : 'Received locally';
      default:
        return isAr ? 'اضغط للتحدث' : 'Tap to speak';
    }
  })();

  const pillTone =
    status === 'recording'
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : status === 'processing'
        ? 'bg-primary/10 text-primary border-primary/30'
        : status === 'done'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          : 'bg-muted text-muted-foreground border-border';

  const PillIcon =
    status === 'recording'
      ? CircleDot
      : status === 'processing' || status === 'starting'
        ? Loader2
        : status === 'done'
          ? CheckCircle2
          : Mic;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <AnimatePresence>
          {recording && (
            <motion.span
              key="pulse"
              className="absolute inset-0 rounded-full bg-destructive/40"
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: [0.9, 1.6, 0.9], opacity: [0.7, 0, 0.7] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {status === 'processing' && (
            <motion.span
              key="proc-ring"
              className="absolute inset-0 rounded-full border-2 border-primary/60"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={
            isAr
              ? recording
                ? 'إيقاف التسجيل'
                : 'بدء التسجيل الصوتي'
              : recording
                ? 'Stop recording'
                : 'Start recording'
          }
          aria-pressed={recording}
          className={`relative ${dim} rounded-full flex items-center justify-center transition-colors ${
            recording
              ? 'bg-destructive text-destructive-foreground'
              : 'gradient-primary text-primary-foreground hover:opacity-90'
          } disabled:opacity-60`}
        >
          {status === 'starting' || status === 'processing' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : recording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Status pill — always visible to make state unmistakable. */}
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${pillTone}`}
      >
        <PillIcon className={`w-3 h-3 ${status === 'processing' || status === 'starting' ? 'animate-spin' : ''}`} />
        <span>{statusLabel}</span>
      </div>

      {!inline && recording && analyser && (
        <Waveform analyser={analyser} className="rounded-md bg-primary/5" />
      )}

      {!inline && (
        <p className="text-[10px] text-muted-foreground text-center max-w-[14rem] leading-tight">
          {hint ??
            (isAr
              ? 'المعالجة الصوتية تتم محلياً 100%، لا يتم تسجيل أو إرسال صوتك.'
              : '100% local processing — your voice is never recorded or uploaded.')}
        </p>
      )}
    </div>
  );
};

export default MicButton;
