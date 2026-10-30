import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Lock, Star } from 'lucide-react';
import { useGameStore, isLevelUnlocked } from '../../store/useGameStore';
import { ALL_LEVELS } from '../../levels';
import { GameLevel } from '../../types/engine';
import { InfoPopover } from '../common/InfoPopover';
import { getConcept } from '../../content/concepts';

const MAX_TAGS = 3;

export function levelCode(lvl: GameLevel): string {
  return lvl.category === 'Learn' ? `S${lvl.roundNumber}` : lvl.category === 'Incidents' ? 'INC' : 'LAB';
}

export function ConceptTags({ ids, max = MAX_TAGS }: { ids: string[]; max?: number }) {
  const shown = ids.slice(0, max);
  const rest = ids.slice(max);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map(id => (
        <InfoPopover key={id} conceptId={id} variant="chip" />
      ))}
      {rest.length > 0 && (
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-md text-obsidian-muted border border-dashed border-obsidian-border"
          title={rest.map(id => getConcept(id)?.title ?? id).join(', ')}
        >
          +{rest.length}
        </span>
      )}
    </div>
  );
}

export function LevelPicker() {
  const { gameMode, currentLevelId, currentLevel, starRecords, loadLevel } = useGameStore();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The top bar clips overflow, so the list renders in a portal positioned under the button.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(380, window.innerWidth - 16);
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        maxHeight: Math.max(200, window.innerHeight - rect.bottom - 24),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as globalThis.Node;
      // Concept popovers render in a portal; clicks inside them keep the picker open.
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t) || (t as Element).closest?.('[role="dialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const levels = ALL_LEVELS.filter(l => l.category === gameMode);

  return (
    <div ref={rootRef} className="relative shrink min-w-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 bg-obsidian-950 border border-obsidian-border hover:border-obsidian-muted text-obsidian-text rounded-lg px-2 py-1 text-xs font-semibold w-32 sm:w-44 md:w-52 min-w-0"
        title="Select stage"
      >
        <span className="text-brand-orange font-mono shrink-0">{levelCode(currentLevel)}</span>
        <span className="truncate flex-1 text-left">{currentLevel.title}</span>
        <ChevronDown className="w-3.5 h-3.5 text-obsidian-muted shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Stages"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, maxHeight: pos?.maxHeight }}
          className="w-[380px] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-obsidian-border bg-obsidian-900 text-obsidian-text shadow-2xl p-1.5 z-[55] space-y-1"
        >
          {levels.map(lvl => {
            const unlocked = isLevelUnlocked(lvl.id, starRecords);
            const stars = starRecords[lvl.id] || 0;
            const active = lvl.id === currentLevelId;
            return (
              <div
                key={lvl.id}
                role="option"
                aria-selected={active}
                aria-disabled={!unlocked}
                className={`rounded-lg border p-2 space-y-1.5 ${
                  active ? 'border-brand-orange/60 bg-orange-500/5' : 'border-transparent hover:bg-obsidian-850'
                } ${unlocked ? '' : 'opacity-50'}`}
              >
                <button
                  disabled={!unlocked}
                  onClick={() => {
                    loadLevel(lvl.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 text-left disabled:cursor-not-allowed"
                >
                  <span className="text-[10px] font-mono font-bold text-brand-orange w-8 shrink-0">{levelCode(lvl)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-obsidian-text truncate">{lvl.title}</span>
                    <span className="block text-[10px] text-obsidian-muted truncate">{lvl.subtitle}</span>
                  </span>
                  {unlocked ? (
                    <span className="flex gap-0.5 shrink-0" aria-label={`${stars} of 3 stars`}>
                      {[1, 2, 3].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= stars ? 'fill-brand-orange text-brand-orange' : 'text-obsidian-border'}`} />
                      ))}
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-obsidian-muted shrink-0" aria-label="Locked" />
                  )}
                </button>
                {lvl.conceptTags.length > 0 && (
                  <div className="pl-10">
                    <ConceptTags ids={lvl.conceptTags} />
                  </div>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
