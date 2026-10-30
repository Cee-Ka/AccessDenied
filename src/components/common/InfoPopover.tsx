import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, ExternalLink, X } from 'lucide-react';
import { getConcept } from '../../content/concepts';

interface InfoPopoverProps {
  conceptId: string;
  /** 'icon' renders an ⓘ button; 'chip' renders the concept title as a tag. */
  variant?: 'icon' | 'chip';
  className?: string;
}

const WIDTH = 320;
const MARGIN = 8;

/**
 * Glossary popover. Opens on click/tap or Enter/Space, closes on Escape or an
 * outside click and returns focus to its trigger. Escape is handled in the
 * capture phase so it closes only the popover, not drawers or selection.
 */
export function InfoPopover({ conceptId, variant = 'icon', className = '' }: InfoPopoverProps) {
  const concept = getConcept(conceptId);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 220;
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - WIDTH - MARGIN);
    const below = rect.bottom + 6;
    const top = below + panelHeight > window.innerHeight - MARGIN ? Math.max(MARGIN, rect.top - panelHeight - 6) : below;
    setPos({ top, left: Math.max(MARGIN, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        close();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as globalThis.Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, close]);

  if (!concept) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={variant === 'icon' ? `What is ${concept.title}?` : `${concept.title}: open explanation`}
        title={variant === 'icon' ? `What is ${concept.title}?` : concept.summary}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        onPointerDown={e => e.stopPropagation()}
        className={
          variant === 'icon'
            ? `nodrag inline-flex items-center justify-center w-4 h-4 rounded-full text-neo-muted hover:text-neo-ink hover:bg-neo-sky shrink-0 ${className}`
            : `nodrag neo-chip bg-neo-sky neo-on-accent shadow-neo-sm hover:-translate-y-px transition-transform ${className}`
        }
      >
        {variant === 'icon' ? <Info className="w-3.5 h-3.5" /> : concept.title}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={concept.title}
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: WIDTH, zIndex: 80 }}
            className="neo-modal p-4 text-xs space-y-2 focus:outline-none"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="neo-heading text-sm">{concept.title}</div>
              <button
                type="button"
                onClick={() => close()}
                className="neo-icon-btn w-6 h-6"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-semibold text-neo-ink leading-relaxed">{concept.summary}</p>
            <p className="text-neo-muted leading-relaxed">{concept.body}</p>
            {concept.example && (
              <pre className="neo-inset p-2 font-mono text-[10px] whitespace-pre-wrap break-all">
                {concept.example}
              </pre>
            )}
            {concept.docsUrl && (
              <a
                href={concept.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-neo-ink underline decoration-2 decoration-neo-orange underline-offset-2 font-semibold"
              >
                AWS docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
