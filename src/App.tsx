import { useState, useEffect } from 'react';
import { TopNav } from './components/hud/TopNav';
import { ComponentDock } from './components/dock/ComponentDock';
import { FlowCanvas } from './components/canvas/FlowCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { HintDrawer } from './components/coach/HintDrawer';
import { IAMCoachModal } from './components/coach/IAMCoachModal';
import { MissionReportCardModal } from './components/coach/MissionReportCardModal';
import { VictoryModal } from './components/modals/VictoryModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { WelcomeModal } from './components/modals/WelcomeModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { GuideOverlay } from './components/coach/GuideOverlay';
import { AskAgentPanel } from './components/coach/AskAgentPanel';
import { ToastHost, TwistPagerBanner } from './components/hud/Notifications';
import { useGameStore, applyThemeToDocument } from './store/useGameStore';

/** True when the key event belongs to a text field or the policy editor. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    Boolean(target.closest('.cm-editor'))
  );
}

export function App() {
  const [hintsOpen, setHintsOpen] = useState(false);
  const {
    theme,
    runSimulation,
    selectNode,
    closeCoachModal,
    isCoachModalOpen,
    undo,
    redo,
    isAskAgentOpen,
    closeAskAgent,
    isSettingsOpen,
    closeSettings,
  } = useGameStore();

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Prevent default window drop navigation (e.g. browser opening dropped text/file)
  useEffect(() => {
    const preventDragNav = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDragNav);
    window.addEventListener('drop', preventDragNav);
    return () => {
      window.removeEventListener('dragover', preventDragNav);
      window.removeEventListener('drop', preventDragNav);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (e.code === 'Escape') {
        if (isAskAgentOpen) closeAskAgent();
        else if (isSettingsOpen) closeSettings();
        else if (isCoachModalOpen) closeCoachModal();
        else {
          selectNode(null);
          setHintsOpen(false);
        }
        return;
      }

      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        runSimulation();
      } else if (
        e.code === 'Space' &&
        !mod &&
        // A focused button already activates on Space; running here too would start and then skip a run.
        !(e.target instanceof HTMLElement && e.target.closest('button, a, [role="button"], [role="option"]'))
      ) {
        e.preventDefault();
        runSimulation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runSimulation, selectNode, closeCoachModal, isCoachModalOpen, undo, redo, isAskAgentOpen, closeAskAgent, isSettingsOpen, closeSettings]);

  return (
    <ErrorBoundary>
      <div className={`flex flex-col w-screen h-screen bg-obsidian-950 text-obsidian-text font-sans overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
        {/* HUD Navigation */}
        <TopNav onToggleHints={() => setHintsOpen(!hintsOpen)} />

        {/* Main Canvas Workspace */}
        <div className="flex-1 relative flex overflow-hidden">
          <ComponentDock />
          <FlowCanvas />
          <TwistPagerBanner />
          <InspectorDrawer />
          <HintDrawer isOpen={hintsOpen} onClose={() => setHintsOpen(false)} />
        </div>

        {/* Popups & Modals */}
        <MissionReportCardModal />
        <IAMCoachModal />
        <VictoryModal />
        <GuideOverlay />
        <AskAgentPanel />
        <SettingsModal />
        <WelcomeModal />
        <ToastHost />
      </div>
    </ErrorBoundary>
  );
}

export default App;
