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
      ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
      : toast.tone === 'error'
      ? 'border-rose-500/50 text-rose-700 dark:text-rose-300'
      : toast.tone === 'warn'
      ? 'border-amber-500/50 text-amber-700 dark:text-amber-300'
      : 'border-obsidian-border text-obsidian-text';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-md w-[calc(100%-2rem)]" role="status" aria-live="polite">
      <div className={`flex items-start gap-2 rounded-xl border bg-obsidian-900 shadow-2xl px-4 py-3 text-xs ${tone}`}>
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="flex-1 leading-relaxed text-obsidian-text">{toast.message}</span>
        <button onClick={dismissToast} className="text-obsidian-muted hover:text-obsidian-text" aria-label="Dismiss">
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
      <div className="flex items-start gap-3 rounded-xl border-2 border-rose-500/60 bg-obsidian-900 shadow-2xl px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4 text-rose-500 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold">You've been paged</div>
          <p className="text-xs text-obsidian-text leading-relaxed">{twist.message.replace(/^Pager:\s*/, '')}</p>
          {twist.sticky && <p className="text-[10px] text-obsidian-muted mt-1">This is a hint about what may break. Your design decides the result.</p>}
        </div>
        <button onClick={dismissTwist} className="text-obsidian-muted hover:text-obsidian-text" aria-label="Dismiss page">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
