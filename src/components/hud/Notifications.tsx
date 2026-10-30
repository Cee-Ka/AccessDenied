import { useEffect } from 'react';
import { BellRing, X, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const TOAST_MS = 5000;
const TWIST_AUTOHIDE_MS = 3500;

export function ToastHost() {
  const toast = useGameStore(s => s.toast);
  const dismissToast = useGameStore(s => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  if (!toast) return null;

  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? XCircle : toast.tone === 'warn' ? AlertTriangle : Info;
  const tone =
    toast.tone === 'success'
      ? 'bg-neo-lime neo-on-accent'
      : toast.tone === 'error'
      ? 'bg-neo-coral neo-on-accent'
      : toast.tone === 'warn'
      ? 'bg-neo-yellow neo-on-accent'
      : '';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-md w-[calc(100%-2rem)]" role="status" aria-live="polite">
      <div className={`flex items-start gap-2 neo-modal px-4 py-3 text-xs ${tone}`}>
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="flex-1 leading-relaxed text-neo-ink">{toast.message}</span>
        <button onClick={dismissToast} className="neo-icon-btn w-6 h-6" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Pager-style twist banner: shows the symptom, never the cause. */
export function TwistPagerBanner() {
  const twist = useGameStore(s => s.twistBanner);
  const dismissTwist = useGameStore(s => s.dismissTwist);

  useEffect(() => {
    if (!twist || twist.sticky) return;
    const t = setTimeout(dismissTwist, TWIST_AUTOHIDE_MS);
    return () => clearTimeout(t);
  }, [twist, dismissTwist]);

  if (!twist) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)]" role="alert">
      <div className="flex items-start gap-3 neo-modal bg-neo-yellow neo-on-accent px-4 py-3">
        <div className="w-8 h-8 rounded bg-neo-coral border-2 border-neo-ink flex items-center justify-center shrink-0 neo-on-accent">
          <BellRing className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-display font-black uppercase tracking-wider">You've been paged</div>
          <p className="text-xs text-neo-ink leading-relaxed">{twist.message.replace(/^Pager:\s*/, '')}</p>
          {twist.sticky && <p className="text-[10px] text-neo-muted mt-1">This is a hint about what may break. Your design decides the result.</p>}
        </div>
        <button onClick={dismissTwist} className="neo-icon-btn w-6 h-6" aria-label="Dismiss page">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
