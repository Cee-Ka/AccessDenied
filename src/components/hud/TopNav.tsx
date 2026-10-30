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
    <header className="h-14 bg-neo-surface border-b-3 border-neo-ink px-2 sm:px-3 lg:px-4 flex items-center justify-between z-40 select-none w-full max-w-full overflow-hidden">
      {/* Zone 1: Brand & Stage Context (Left) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 rounded bg-neo-orange text-neo-on-accent border-2 border-neo-ink flex items-center justify-center shadow-neo-sm neo-on-accent">
            <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-display font-black text-xs sm:text-sm tracking-tight text-neo-ink hidden sm:flex items-center gap-0.5">
            Access<span className="bg-neo-orange text-neo-on-accent px-1 rounded-sm neo-on-accent">Denied</span>
          </span>
        </div>

        <div className="h-5 w-[2px] bg-neo-ink hidden md:block shrink-0" />

        {/* Mode Selector */}
        <div className="flex items-center bg-neo-bg p-0.5 rounded border-2 border-neo-ink text-xs shrink-0">
          {(['Learn', 'Incidents', 'Sandbox'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={`px-2 py-0.5 rounded-sm text-[11px] font-display font-bold transition-colors ${
                gameMode === mode
                  ? 'bg-neo-orange text-neo-on-accent border-2 border-neo-ink neo-on-accent'
                  : 'border-2 border-transparent text-neo-muted hover:text-neo-ink'
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

            <div className="hidden 2xl:flex items-center gap-0.5 shrink-0">
              {[1, 2, 3].map(starNum => (
                <Star
                  key={starNum}
                  className={`w-3 h-3 ${
                    starNum <= currentLevelStars
                      ? 'fill-neo-yellow text-neo-ink'
                      : 'text-neo-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zone 2: Telemetry HUD (Center) - Styled so budget never spills out */}
      <div className="hidden lg:flex items-center bg-neo-bg border-2 border-neo-ink px-3 py-1 rounded-full font-mono text-xs gap-2.5 shrink-0 whitespace-nowrap mx-2">
        <div className="flex items-center gap-1 shrink-0 whitespace-nowrap" title="Workloads verified">
          <CheckCircle2 className="w-3.5 h-3.5 text-neo-muted shrink-0" />
          <span className="text-neo-muted text-[11px] hidden 2xl:inline">Work:</span>
          <span className={legitPassed === legitPackets.length && legitPackets.length > 0 ? 'text-neo-ink font-bold' : 'text-neo-muted'}>
            {legitPassed}/{legitPackets.length}
          </span>
        </div>

        {exploitPackets.length > 0 && (
          <>
            <span className="w-1 h-3 bg-neo-ink rounded-full shrink-0" />
            <div className="flex items-center gap-1 shrink-0 whitespace-nowrap" title="Adversary exploit probes blocked">
              <Shield className="w-3.5 h-3.5 text-neo-ink shrink-0" />
              <span className="text-neo-muted text-[11px] hidden 2xl:inline">Threats:</span>
              <span className={exploitBlocked === exploitPackets.length ? 'text-neo-ink font-bold' : 'neo-badge-deny'}>
                {exploitBlocked}/{exploitPackets.length}
              </span>
            </div>
          </>
        )}

        <span className="w-1 h-3 bg-neo-ink rounded-full shrink-0" />
        {/* Generous comfortable budget container with dedicated pill so amounts never spill */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Monthly AWS architectural cost vs budget limit">
          <Zap className="w-3.5 h-3.5 text-neo-ink shrink-0" />
          <span className="text-neo-muted text-[11px] hidden 2xl:inline">Budget:</span>
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-xs whitespace-nowrap inline-block ${
              isOverBudget
                ? 'text-neo-on-accent bg-neo-coral border-2 border-neo-ink neo-on-accent '
                : 'text-neo-ink bg-neo-raised border-2 border-neo-ink '
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
            className="neo-btn bg-neo-yellow text-neo-on-accent shadow-neo-sm px-2.5 shrink-0 neo-on-accent"
            title="Open Stage Mission Dossier & Blueprint Checklist"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Brief</span>
          </button>
        )}

        {hasGuide && !isGuideOpen && (
          <button
            onClick={openGuide}
            className="neo-btn neo-btn-secondary shadow-neo-sm px-2.5 shrink-0"
            title="Resume the guide"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        )}

        <button
          onClick={onToggleHints}
          className="neo-btn neo-btn-secondary shadow-neo-sm w-8 h-8 p-0 shrink-0"
          title="Hints & Debrief"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Utilities cluster */}
        <div className="flex items-center bg-neo-surface p-0.5 rounded border-2 border-neo-ink gap-0.5 shrink-0">
          <button
            onClick={toggleTheme}
            className="neo-icon-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-neo-ink" /> : <Moon className="w-3.5 h-3.5 text-neo-ink" />}
          </button>

          <button
            onClick={undo}
            disabled={isRunning || history.past.length === 0}
            className="neo-icon-btn"
            title={`Undo (${MOD}+Z)`}
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={redo}
            disabled={isRunning || history.future.length === 0}
            className="neo-icon-btn"
            title={`Redo (${MOD}+Shift+Z)`}
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={openSettings}
            className="neo-icon-btn"
            title="Start over, export / import board"
            aria-label="Start over or export board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSimSpeed(simSpeed === 1 ? 2 : 1)}
            className="neo-icon-btn w-auto px-1.5 gap-0.5 text-[11px] font-mono"
            title="Simulation Speed"
          >
            <FastForward className="w-3 h-3 text-neo-ink" />
            {simSpeed}x
          </button>

          <button
            onClick={toggleSound}
            className="neo-icon-btn"
            title={isSoundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-neo-ink" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={openSettings}
            className="neo-icon-btn w-auto px-1.5 gap-1"
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
          className={`neo-btn shrink-0 ${isRunning ? 'neo-btn-secondary' : 'neo-btn-primary'}`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Skip to end</span>
              <SkipForward className="w-3.5 h-3.5 shrink-0" />
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Simulate</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
