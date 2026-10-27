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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-6">
        {/* Trophy Header */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Architecture Verified!
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {currentLevel.title} — Round {currentLevel.roundNumber} Complete
          </p>
          {nextLevel && nextLevel.category === currentLevel.category && (
            <div className="mt-2 text-[11px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 rounded-full px-3 py-1 inline-flex items-center gap-1.5 shadow-sm">
              <span>🔓</span>
              <span>Next Round Unlocked: <strong>{nextLevel.title}</strong></span>
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
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-700'
                }`}
              >
                <Star className={`w-6 h-6 ${hasStar ? 'fill-current' : ''}`} />
              </div>
            );
          })}
        </div>

        {/* Breakdown */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 text-xs space-y-2.5 text-left font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">★ 1: Business Continuity</span>
            <span className="text-emerald-400 font-semibold">100% OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">★ 2: Threat Hardening</span>
            <span className={earnedStars >= 2 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
              {earnedStars >= 2 ? 'Zero Breaches' : 'Exploit Allowed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">★ 3: Cost & Least Privilege</span>
            <span className={earnedStars >= 3 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
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
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>

          {nextLevel ? (
            <button
              onClick={handleNextLevel}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all"
            >
              Next Round
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={closeVictoryModal}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
