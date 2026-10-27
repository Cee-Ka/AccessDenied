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
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-100">Round Intel & Hints</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Mission Brief */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Scenario Brief</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {currentLevel.storyBrief}
          </p>
        </div>

        {/* Threat Intel */}
        {currentLevel.threatIntel && (
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Threat Intelligence</span>
            </div>
            <p className="text-rose-200/90 leading-relaxed text-[11px]">
              {currentLevel.threatIntel}
            </p>
          </div>
        )}

        {/* Progressive 3-Tier Hints */}
        {hints.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              IAM Coach Clues
            </div>

            {hints.map((hint, idx) => {
              const isUnlocked = idx <= unlockedTier;
              return (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      if (!isUnlocked) {
                        setUnlockedTier(idx);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Key className={`w-3.5 h-3.5 ${isUnlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                      <span className={`font-semibold capitalize text-xs ${isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                        Hint {idx + 1}: {hint.title}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                        Unlock <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {isUnlocked && (
                    <div className="px-3.5 pb-3 text-[11px] text-slate-300 leading-relaxed border-t border-slate-900 pt-2 font-mono whitespace-pre-wrap bg-slate-900/30">
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
