import { useGameStore } from '../../store/useGameStore';
import { ALL_LEVELS } from '../../levels';
import { Star, Trophy, ArrowRight, RotateCcw, LockOpen } from 'lucide-react';
import { AskAgentButton } from '../coach/AskAgentPanel';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim animate-in fade-in duration-200">
      <div className="relative w-full max-w-md neo-modal p-6 text-center space-y-6">
        {/* Trophy Header */}
        <div className="relative mx-auto w-16 h-16 rounded-neo bg-neo-raised border-2 border-neo-ink flex items-center justify-center shadow-neo ">
          <Trophy className="w-8 h-8 text-neo-ink" />
        </div>

        <div>
          <h2 className="neo-heading text-xl font-extrabold text-neo-ink tracking-tight">
            Architecture Verified!
          </h2>
          <p className="text-xs text-neo-muted mt-1">
            {currentLevel.title}{currentLevel.category === 'Learn' ? ` — Round ${currentLevel.roundNumber}` : ''} Complete
          </p>
          {nextLevel && nextLevel.category === currentLevel.category && (
            <div className="neo-badge-new mt-2 text-[11px] px-3 py-1">
              <LockOpen className="w-3 h-3" aria-hidden />
              <span>Next Stage Unlocked: <strong className="text-neo-ink">{nextLevel.title}</strong></span>
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
                className={`w-12 h-12 rounded flex items-center justify-center border-2 border-neo-ink ${
                  hasStar ? 'bg-neo-yellow neo-on-accent shadow-neo -translate-y-0.5' : 'bg-neo-raised text-neo-muted border-dashed'
                }`}
              >
                <Star className={`w-6 h-6 ${hasStar ? 'fill-current' : ''}`} />
              </div>
            );
          })}
        </div>

        {/* Breakdown */}
        <div className="bg-neo-raised rounded-neo border-2 border-neo-ink p-4 text-xs space-y-2.5 text-left font-mono">
          <div className="flex items-center justify-between">
            <span className="text-neo-muted inline-flex items-center gap-1"><Star className="w-3 h-3" aria-hidden />1: Business Continuity</span>
            <span className="text-neo-ink font-bold">100% OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neo-muted inline-flex items-center gap-1"><Star className="w-3 h-3" aria-hidden />2: Threat Hardening</span>
            <span className={earnedStars >= 2 ? 'text-neo-ink font-bold' : 'text-neo-muted'}>
              {earnedStars >= 2 ? 'Zero Breaches' : 'Exploit Allowed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neo-muted inline-flex items-center gap-1"><Star className="w-3 h-3" aria-hidden />3: Within Budget</span>
            <span className={earnedStars >= 3 ? 'text-neo-ink font-bold' : 'text-neo-muted'}>
              {earnedStars >= 3 ? 'Within Budget' : earnedStars >= 2 ? 'Over Budget' : 'Not Yet'}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <AskAgentButton />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              resetCurrentLevel();
              closeVictoryModal();
            }}
            className="neo-btn neo-btn-secondary flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>

          {nextLevel ? (
            <button
              onClick={handleNextLevel}
              className="neo-btn neo-btn-primary flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            >
              Next Stage
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={closeVictoryModal}
              className="neo-btn neo-btn-primary flex-1 px-4 py-2.5"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
