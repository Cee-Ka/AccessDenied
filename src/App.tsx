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
import { useGameStore, applyThemeToDocument } from './store/useGameStore';

export function App() {
  const [hintsOpen, setHintsOpen] = useState(false);
  const { theme, runSimulation, selectNode, closeCoachModal, isCoachModalOpen } = useGameStore();

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        runSimulation();
      } else if (e.code === 'Escape') {
        if (isCoachModalOpen) {
          closeCoachModal();
        } else {
          selectNode(null);
          setHintsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runSimulation, selectNode, closeCoachModal, isCoachModalOpen]);

  return (
    <ErrorBoundary>
      <div className={`flex flex-col w-screen h-screen bg-obsidian-950 text-obsidian-text font-sans overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
        {/* HUD Navigation */}
        <TopNav onToggleHints={() => setHintsOpen(!hintsOpen)} />

        {/* Main Canvas Workspace */}
        <div className="flex-1 relative flex overflow-hidden">
          <ComponentDock />
          <FlowCanvas />
          <InspectorDrawer />
          <HintDrawer isOpen={hintsOpen} onClose={() => setHintsOpen(false)} />
        </div>

        {/* Popups & Modals */}
        <MissionReportCardModal />
        <IAMCoachModal />
        <VictoryModal />
      </div>
    </ErrorBoundary>
  );
}

export default App;
