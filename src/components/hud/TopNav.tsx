import { useGameStore, GameMode, isLevelUnlocked } from '../../store/useGameStore';
import { ALL_LEVELS } from '../../levels';
import { Shield, Star, Volume2, VolumeX, RotateCcw, Play, FastForward, HelpCircle } from 'lucide-react';

interface TopNavProps {
  onToggleHints: () => void;
}

export function TopNav({ onToggleHints }: TopNavProps) {
  const {
    gameMode,
    setGameMode,
    currentLevelId,
    loadLevel,
    resetCurrentLevel,
    currentLevel,
    starRecords,
    isSoundMuted,
    toggleSound,
    simStatus,
    runSimulation,
    simSpeed,
    setSimSpeed,
    nodes,
    results,
  } = useGameStore();

  const totalCost = nodes.reduce((acc, n) => acc + (n.data.monthlyCost || 0), 0);
  const targetBudget = currentLevel.targetBudget;
  const isOverBudget = totalCost > targetBudget;

  const legitPackets = currentLevel.packets.filter(p => p.kind === 'legitimate');
  const exploitPackets = currentLevel.packets.filter(p => p.kind === 'exploit');

  const legitPassed = results.filter((r, idx) => currentLevel.packets[idx]?.kind === 'legitimate' && r.success).length;
  const exploitBlocked = results.filter((r, idx) => currentLevel.packets[idx]?.kind === 'exploit' && r.success).length;

  const currentLevelStars = starRecords[currentLevelId] || 0;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-40 select-none shadow-md">
      {/* Brand & Mode Switcher */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1">
            Access<span className="text-amber-400">Denied</span>
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['Learn', 'Incidents', 'Sandbox'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                gameMode === mode
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Level Dropdown (Only for Learn & Incidents) */}
        {gameMode !== 'Sandbox' && (
          <div className="flex items-center gap-2">
            <select
              value={currentLevelId}
              onChange={e => loadLevel(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-amber-400 max-w-xs truncate"
            >
              {ALL_LEVELS.filter(l => l.category === gameMode).map(lvl => {
                const unlocked = isLevelUnlocked(lvl.id, starRecords);
                const stars = starRecords[lvl.id] || 0;
                const starStr = stars > 0 ? ` (${'★'.repeat(stars)})` : '';
                return (
                  <option
                    key={lvl.id}
                    value={lvl.id}
                    disabled={!unlocked}
                    className={unlocked ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-500 font-sans'}
                  >
                    {unlocked ? '' : '🔒 '}
                    {lvl.roundNumber > 0 ? `Round ${lvl.roundNumber}: ` : ''}
                    {lvl.title}
                    {unlocked ? starStr : ' (Locked)'}
                  </option>
                );
              })}
            </select>

            <div className="flex items-center gap-0.5 text-amber-400 text-xs">
              {[1, 2, 3].map(starNum => (
                <Star
                  key={starNum}
                  className={`w-3.5 h-3.5 ${
                    starNum <= currentLevelStars
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center Live Metrics */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-400">Workloads:</span>
          <span className={legitPassed === legitPackets.length && legitPackets.length > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
            {legitPassed}/{legitPackets.length}
          </span>
        </div>

        {exploitPackets.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Exploits Blocked:</span>
            <span className={exploitBlocked === exploitPackets.length ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
              {exploitBlocked}/{exploitPackets.length}
            </span>
          </div>
        )}

        <div className={`flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border ${isOverBudget ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
          <span className="text-slate-400">Budget:</span>
          <span className={isOverBudget ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
            ${totalCost} / ${targetBudget} mo
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSound}
          className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={isSoundMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleHints}
          className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
          title="Hints & Debrief"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={resetCurrentLevel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <button
          onClick={() => setSimSpeed(simSpeed === 1 ? 2 : 1)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors flex items-center gap-1"
          title="Simulation Speed"
        >
          <FastForward className="w-3.5 h-3.5 text-amber-400" />
          {simSpeed}x
        </button>

        <button
          onClick={runSimulation}
          disabled={simStatus === 'running'}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
            simStatus === 'running'
              ? 'bg-amber-600/50 text-slate-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:scale-[1.02]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {simStatus === 'running' ? 'Simulating...' : 'Simulate'}
        </button>
      </div>
    </header>
  );
}
