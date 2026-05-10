import { useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
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

/**
 * Voice-ready UI scaffold.
 *
 * Today: captures audio locally + shows a live waveform.
 * Tomorrow: hand the captured Float32 buffer to the lean tAI STT engine,
 *           then call `onVoiceTranscript(text)`.
 */
const MicButton = ({ onVoiceTranscript, hint, size = 'md', inline = false }: MicButtonProps) => {
  const { lang } = useApp();
  const isAr = lang === 'ar';
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);

  const dim = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

  const start = async () => {
    if (recording || busy) return;
    setBusy(true);
    try {
      const session = await startVoiceSession();
      sessionRef.current = session;
      setAnalyser(session.analyser);
      setRecording(true);
    } catch (e) {
      const code = (e as Error).message;
      toast.error(
        code === 'mic-unsupported'
          ? isAr
            ? 'متصفحك لا يدعم الميكروفون.'
            : 'Microphone not supported in this browser.'
          : isAr
            ? 'تم رفض إذن الميكروفون.'
            : 'Microphone permission denied.',
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setRecording(false);
    setAnalyser(null);
    if (!session) return;
    setBusy(true);
    try {
      const buffer = await session.stop();
      // TODO(tAI): run buffer through the lean local STT engine.
      // For now we just acknowledge and pass through any transcript.
      void buffer;
      if (onVoiceTranscript) {
        // Placeholder bridge — real text will arrive once tAI engine ships.
        onVoiceTranscript('');
      }
      toast.message(
        isAr
          ? 'تم الاستماع — محرك التفريغ النصي قيد التحضير.'
          : 'Captured — local transcript engine coming soon.',
      );
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => (recording ? stop() : start());

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
        </AnimatePresence>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={isAr ? (recording ? 'إيقاف التسجيل' : 'بدء التسجيل الصوتي') : recording ? 'Stop recording' : 'Start recording'}
          className={`relative ${dim} rounded-full flex items-center justify-center transition-colors ${
            recording
              ? 'bg-destructive text-destructive-foreground'
              : 'gradient-primary text-primary-foreground hover:opacity-90'
          } disabled:opacity-50`}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : recording ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
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
