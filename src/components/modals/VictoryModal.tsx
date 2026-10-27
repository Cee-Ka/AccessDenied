import { useGameStore } from '../../store/useGameStore';
import { ALL_LEVELS } from '../../levels';
import { Star, Trophy, ArrowRight, RotateCcw } from 'lucide-react';

export function VictoryModal() {
  const {
    isVictoryModalOpen,
    closeVictoryModal,
    earnedStars,
    currentLevel,
    loadLevel,
    resetCurrentLevel,
  } = useGameStore();

  if (!isVictoryModalOpen) return null;

  const currentIdx = ALL_LEVELS.findIndex(l => l.id === currentLevel.id);
  const nextLevel = ALL_LEVELS[currentIdx + 1];

  const handleNextLevel = () => {
    if (nextLevel) {
      loadLevel(nextLevel.id);
    } else {
      closeVictoryModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-obsidian-900 border border-obsidian-border rounded-3xl shadow-2xl p-6 text-center space-y-6">
        {/* Trophy Header */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-obsidian-box border border-brand-orange/50 flex items-center justify-center shadow-xl shadow-orange-500/20">
          <Trophy className="w-8 h-8 text-brand-orange" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-obsidian-text tracking-tight">
            Architecture Verified!
          </h2>
          <p className="text-xs text-obsidian-muted mt-1">
            {currentLevel.title} — Round {currentLevel.roundNumber} Complete
          </p>
          {nextLevel && nextLevel.category === currentLevel.category && (
            <div className="mt-2 text-[11px] font-mono text-brand-orange bg-obsidian-box border border-brand-orange/40 rounded-full px-3 py-1 inline-flex items-center gap-1.5 shadow-sm">
              <span>🔓</span>
              <span>Next Stage Unlocked: <strong className="text-obsidian-text">{nextLevel.title}</strong></span>
            </div>
          )}
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3].map(starNum => {
            const hasStar = starNum <= earnedStars;
            return (
              <div
                key={starNum}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                  hasStar
                    ? 'bg-obsidian-box border-brand-orange text-brand-orange scale-110 shadow-lg shadow-orange-500/25'
                    : 'bg-obsidian-box border-obsidian-border text-obsidian-muted'
                }`}
              >
                <Star className={`w-6 h-6 ${hasStar ? 'fill-current' : ''}`} />
              </div>
            );
          })}
        </div>

        {/* Breakdown */}
        <div className="bg-obsidian-box rounded-2xl border border-obsidian-border p-4 text-xs space-y-2.5 text-left font-mono">
          <div className="flex items-center justify-between">
            <span className="text-obsidian-muted">★ 1: Business Continuity</span>
            <span className="text-brand-orange font-bold">100% OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-obsidian-muted">★ 2: Threat Hardening</span>
            <span className={earnedStars >= 2 ? 'text-brand-orange font-bold' : 'text-obsidian-muted'}>
              {earnedStars >= 2 ? 'Zero Breaches' : 'Exploit Allowed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-obsidian-muted">★ 3: Cost & Least Privilege</span>
            <span className={earnedStars >= 3 ? 'text-brand-orange font-bold' : 'text-obsidian-muted'}>
              {earnedStars >= 3 ? 'Within Budget' : 'Exceeded / Wildcards'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              resetCurrentLevel();
              closeVictoryModal();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-obsidian-text border border-obsidian-border text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>

          {nextLevel ? (
            <button
              onClick={handleNextLevel}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
            >
              Next Stage
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={closeVictoryModal}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
