import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, BookOpen, ShieldAlert, Key, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';

interface HintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HintDrawer({ isOpen, onClose }: HintDrawerProps) {
  const currentLevel = useGameStore(s => s.currentLevel);
  const [unlockedTier, setUnlockedTier] = useState<number>(0);

  if (!isOpen) return null;

  const hints = currentLevel.hints || [];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-obsidian-900/95 backdrop-blur-xl border-l border-obsidian-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-obsidian-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-orange" />
          <span className="text-xs font-bold text-obsidian-text">Round Intel & Hints</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Mission Brief */}
        <div className="bg-obsidian-box border border-obsidian-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-obsidian-text font-bold">
            <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
            <span>Scenario Brief</span>
          </div>
          <p className="text-obsidian-muted leading-relaxed text-[11px]">
            {currentLevel.storyBrief}
          </p>
        </div>

        {/* Threat Intel */}
        {currentLevel.threatIntel && (
          <div className="bg-rose-500/5 border border-rose-500/20 dark:border-rose-900/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-500 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Threat Intelligence</span>
            </div>
            <p className="text-obsidian-muted leading-relaxed text-[11px]">
              {currentLevel.threatIntel}
            </p>
          </div>
        )}

        {/* Progressive 3-Tier Hints */}
        {hints.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-obsidian-text uppercase tracking-wider">
              IAM Coach Clues
            </div>

            {hints.map((hint, idx) => {
              const isUnlocked = idx <= unlockedTier;
              return (
                <div
                  key={idx}
                  className="bg-obsidian-box border border-obsidian-border rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      if (!isUnlocked) {
                        setUnlockedTier(idx);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-obsidian-850 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Key className={`w-3.5 h-3.5 ${isUnlocked ? 'text-brand-orange' : 'text-obsidian-muted'}`} />
                      <span className={`font-semibold capitalize text-xs ${isUnlocked ? 'text-obsidian-text' : 'text-obsidian-muted'}`}>
                        Hint {idx + 1}: {hint.title}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <ChevronDown className="w-3.5 h-3.5 text-obsidian-muted" />
                    ) : (
                      <span className="text-[10px] text-brand-orange font-mono flex items-center gap-1">
                        Unlock <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {isUnlocked && (
                    <div className="px-3.5 pb-3 text-[11px] text-obsidian-muted leading-relaxed border-t border-obsidian-border pt-2 font-mono whitespace-pre-wrap bg-obsidian-950">
                      {hint.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
