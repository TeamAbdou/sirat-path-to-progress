import { useEffect, useState } from 'react';
import { subscribeEngine, ensureEngine, isWebGPUAvailable, type getEngineState } from '@/lib/llm/engine';
import { useApp } from '@/contexts/AppContext';
import { Cpu, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

type State = ReturnType<typeof getEngineState>;

const LocalAIStatus = () => {
  const { lang } = useApp();
  const isAr = lang === 'ar';
  const [state, setState] = useState<State>({ status: 'idle', progress: 0, progressText: '' });

  useEffect(() => subscribeEngine(setState), []);

  if (!isWebGPUAvailable()) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-foreground leading-relaxed">
          {isAr
            ? 'متصفحك لا يدعم WebGPU. الذكاء الاصطناعي المحلي يحتاج Chrome/Edge حديث على جهاز يدعم WebGPU.'
            : 'Your browser does not support WebGPU. Local AI needs a modern Chrome/Edge on a WebGPU-capable device.'}
        </p>
      </div>
    );
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={() => ensureEngine().catch(() => {})}
        className="w-full rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center gap-2 text-xs hover:bg-primary/20 transition-colors text-start"
      >
        <Download className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-foreground">
          {isAr
            ? 'حمّل النموذج المحلي (مرة واحدة، ~700MB) للعمل بدون إنترنت'
            : 'Download local model (one time, ~700MB) for offline use'}
        </span>
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-foreground font-medium">
            {isAr ? 'جارٍ تحميل النموذج المحلي…' : 'Loading local model…'}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(state.progress * 100)}%` }}
          />
        </div>
        <p className="text-muted-foreground truncate">{state.progressText}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="font-medium">{isAr ? 'فشل التحميل' : 'Load failed'}</span>
        </div>
        <p className="text-muted-foreground">{state.error}</p>
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <span className="text-foreground">
          {isAr ? 'الذكاء الاصطناعي المحلي جاهز' : 'Local AI ready'}
        </span>
      </div>
    );
  }

  return null;
};

export default LocalAIStatus;
