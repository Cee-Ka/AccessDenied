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
    <div className="fixed inset-y-0 right-0 w-96 neo-panel border-l-3 z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b-2 border-neo-ink">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-neo-ink" />
          <span className="text-xs font-bold text-neo-ink">Round Intel & Hints</span>
        </div>
        <button
          onClick={onClose}
          className="neo-icon-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Mission Brief */}
        <div className="bg-neo-raised border-2 border-neo-ink rounded-neo p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-neo-ink font-bold">
            <Sparkles className="w-3.5 h-3.5 text-neo-ink" />
            <span>Scenario Brief</span>
          </div>
          <p className="text-neo-muted leading-relaxed text-[11px]">
            {currentLevel.storyBrief}
          </p>
        </div>

        {/* Threat Intel */}
        {currentLevel.threatIntel && (
          <div className="bg-neo-coral border-2 border-neo-ink rounded-neo p-3.5 space-y-2 neo-on-accent">
            <div className="flex items-center gap-1.5 text-neo-ink font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-neo-ink" />
              <span>Threat Intelligence</span>
            </div>
            <p className="text-neo-muted leading-relaxed text-[11px]">
              {currentLevel.threatIntel}
            </p>
          </div>
        )}

        {/* Progressive 3-Tier Hints */}
        {hints.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-neo-ink uppercase tracking-wider">
              IAM Coach Clues
            </div>

            {hints.map((hint, idx) => {
              const isUnlocked = idx <= unlockedTier;
              return (
                <div
                  key={idx}
                  className="bg-neo-raised border-2 border-neo-ink rounded-neo overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      if (!isUnlocked) {
                        setUnlockedTier(idx);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-neo-raised transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Key className={`w-3.5 h-3.5 ${isUnlocked ? 'text-neo-ink' : 'text-neo-muted'}`} />
                      <span className={`font-semibold capitalize text-xs ${isUnlocked ? 'text-neo-ink' : 'text-neo-muted'}`}>
                        Hint {idx + 1}: {hint.title}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neo-muted" />
                    ) : (
                      <span className="text-[10px] text-neo-ink font-mono flex items-center gap-1">
                        Unlock <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {isUnlocked && (
                    <div className="px-3.5 pb-3 text-[11px] text-neo-muted leading-relaxed border-t-2 border-neo-ink pt-2 font-mono whitespace-pre-wrap bg-neo-bg">
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
