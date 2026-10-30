import { useGameStore, GameMode } from '../../store/useGameStore';
import { LevelPicker } from './LevelPicker';
import {
  Shield,
  Star,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  FastForward,
  HelpCircle,
  FileText,
  CheckCircle2,
  Zap,
  Loader2,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Settings,
  GraduationCap,
  SkipForward,
} from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

interface TopNavProps {
  onToggleHints: () => void;
}

export function TopNav({ onToggleHints }: TopNavProps) {
  const {
    theme,
    toggleTheme,
    gameMode,
    setGameMode,
    currentLevelId,
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
    openReportCard,
    history,
    undo,
    redo,
    openSettings,
    profile,
    isGuideOpen,
    openGuide,
  } = useGameStore();
  const isRunning = simStatus === 'running';
  const hasGuide = Boolean(currentLevel.onboardingSteps?.length);

  const totalCost = nodes.reduce((acc, n) => acc + (n.data.monthlyCost || 0), 0);
  const targetBudget = currentLevel.targetBudget;
  const isOverBudget = totalCost > targetBudget;

  const legitPackets = currentLevel.packets.filter(p => p.kind === 'legitimate');
  const exploitPackets = currentLevel.packets.filter(p => p.kind === 'exploit');

  const legitPassed = results.filter((r, idx) => currentLevel.packets[idx]?.kind === 'legitimate' && r.success).length;
  const exploitBlocked = results.filter((r, idx) => currentLevel.packets[idx]?.kind === 'exploit' && r.success).length;

  const currentLevelStars = starRecords[currentLevelId] || 0;

  return (
    <header className="h-14 bg-obsidian-900 border-b border-obsidian-border px-2 sm:px-3 lg:px-4 flex items-center justify-between z-40 select-none shadow-md shadow-black/5 dark:shadow-black/50 w-full max-w-full overflow-hidden">
      {/* Zone 1: Brand & Stage Context (Left) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-obsidian-box border border-brand-orange/40 flex items-center justify-center shadow-md shadow-orange-500/10">
            <Shield className="w-3.5 h-3.5 text-brand-orange stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-obsidian-text hidden sm:flex items-center gap-0.5">
            Access<span className="text-brand-orange">Denied</span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-obsidian-border hidden md:block shrink-0" />

        {/* Mode Selector */}
        <div className="flex items-center bg-obsidian-950 p-0.5 rounded-lg border border-obsidian-border text-xs shrink-0">
          {(['Learn', 'Incidents', 'Sandbox'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                gameMode === mode
                  ? 'bg-obsidian-850 text-brand-orange shadow-sm border border-brand-orange/30'
                  : 'text-obsidian-muted hover:text-obsidian-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Compact Stage Dropdown (Resized smaller per user request) */}
        {gameMode !== 'Sandbox' && (
          <div className="flex items-center gap-1 shrink min-w-0">
<LevelPicker />

            <div className="hidden xl:flex items-center gap-0.5 shrink-0">
              {[1, 2, 3].map(starNum => (
                <Star
                  key={starNum}
                  className={`w-3 h-3 ${
                    starNum <= currentLevelStars
                      ? 'fill-brand-orange text-brand-orange'
                      : 'text-obsidian-border'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zone 2: Telemetry HUD (Center) - Styled so budget never spills out */}
      <div className="hidden lg:flex items-center bg-obsidian-950 border border-obsidian-border px-3 py-1 rounded-full font-mono text-xs shadow-inner gap-2.5 shrink-0 whitespace-nowrap mx-2">
        <div className="flex items-center gap-1 shrink-0 whitespace-nowrap" title="Workloads verified">
          <CheckCircle2 className="w-3.5 h-3.5 text-obsidian-muted shrink-0" />
          <span className="text-obsidian-muted text-[11px]">Work:</span>
          <span className={legitPassed === legitPackets.length && legitPackets.length > 0 ? 'text-obsidian-text font-bold' : 'text-obsidian-muted'}>
            {legitPassed}/{legitPackets.length}
          </span>
        </div>

        {exploitPackets.length > 0 && (
          <>
            <span className="w-1 h-3 bg-obsidian-border rounded-full shrink-0" />
            <div className="flex items-center gap-1 shrink-0 whitespace-nowrap" title="Adversary exploit probes blocked">
              <Shield className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              <span className="text-obsidian-muted text-[11px]">Threats:</span>
              <span className={exploitBlocked === exploitPackets.length ? 'text-brand-orange font-bold' : 'text-rose-500 font-bold'}>
                {exploitBlocked}/{exploitPackets.length}
              </span>
            </div>
          </>
        )}

        <span className="w-1 h-3 bg-obsidian-border rounded-full shrink-0" />
        {/* Generous comfortable budget container with dedicated pill so amounts never spill */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Monthly AWS architectural cost vs budget limit">
          <Zap className="w-3.5 h-3.5 text-brand-orange shrink-0" />
          <span className="text-obsidian-muted text-[11px]">Budget:</span>
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-xs whitespace-nowrap inline-block ${
              isOverBudget
                ? 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-900 shadow-sm'
                : 'text-obsidian-text bg-obsidian-box border border-obsidian-border shadow-inner'
            }`}
          >
            ${totalCost} / ${targetBudget}/mo
          </span>
        </div>
      </div>

      {/* Zone 3: Actions & Simulate Command (Right) - Locked shrink-0 so Simulate is ALWAYS visible */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Briefing trigger */}
        {currentLevel.reportCard && (
          <button
            onClick={openReportCard}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-brand-orange/40 text-brand-orange text-xs font-bold transition-all hover:scale-[1.02] shadow-sm shadow-orange-500/10 shrink-0"
            title="Open Stage Mission Dossier & Blueprint Checklist"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Brief</span>
          </button>
        )}

        {hasGuide && !isGuideOpen && (
          <button
            onClick={openGuide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-obsidian-950 hover:bg-obsidian-850 border border-brand-orange/40 text-brand-orange text-xs font-bold shrink-0"
            title="Resume the guide"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        )}

        <button
          onClick={onToggleHints}
          className="p-1.5 rounded-lg bg-obsidian-950 hover:bg-obsidian-850 border border-obsidian-border text-obsidian-muted hover:text-brand-orange transition-colors shrink-0"
          title="Hints & Debrief"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Utilities cluster */}
        <div className="flex items-center bg-obsidian-950 p-0.5 rounded-lg border border-obsidian-border gap-0.5 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-brand-orange transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-brand-orange" />}
          </button>

          <button
            onClick={undo}
            disabled={isRunning || history.past.length === 0}
            className="p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-obsidian-text transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title={`Undo (${MOD}+Z)`}
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={redo}
            disabled={isRunning || history.future.length === 0}
            className="p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-obsidian-text transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title={`Redo (${MOD}+Shift+Z)`}
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={openSettings}
            className="p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-obsidian-text transition-colors"
            title="Start over, export / import board"
            aria-label="Start over or export board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSimSpeed(simSpeed === 1 ? 2 : 1)}
            className="px-1.5 py-1 rounded-md hover:bg-obsidian-850 text-[11px] font-mono text-obsidian-muted hover:text-brand-orange transition-colors flex items-center gap-0.5"
            title="Simulation Speed"
          >
            <FastForward className="w-3 h-3 text-brand-orange" />
            {simSpeed}x
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-obsidian-text transition-colors"
            title={isSoundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={openSettings}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-obsidian-850 text-obsidian-muted hover:text-obsidian-text transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            {profile.displayName && (
              <span className="hidden xl:inline text-[11px] font-semibold max-w-[90px] truncate">{profile.displayName}</span>
            )}
          </button>
        </div>

        {/* Primary CTA: Simulate, or Skip to end while running */}
        <button
          onClick={runSimulation}
          data-tour="simulate"
          title={isRunning ? 'Skip to the results' : `Simulate (${MOD}+Enter or Space)`}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all shrink-0 whitespace-nowrap ${
            isRunning
              ? 'bg-obsidian-850 text-obsidian-text border border-brand-orange/60 hover:bg-obsidian-800'
              : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-orange-500/25 hover:scale-[1.03] active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange shrink-0" />
              <span>Skip to end</span>
              <SkipForward className="w-3.5 h-3.5 shrink-0" />
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black text-black shrink-0" />
              <span>Simulate</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
