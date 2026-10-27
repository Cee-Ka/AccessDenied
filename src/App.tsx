import { useState, useEffect } from 'react';
import { TopNav } from './components/hud/TopNav';
import { ComponentDock } from './components/dock/ComponentDock';
import { FlowCanvas } from './components/canvas/FlowCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { HintDrawer } from './components/coach/HintDrawer';
import { IAMCoachModal } from './components/coach/IAMCoachModal';
import { MissionReportCardModal } from './components/coach/MissionReportCardModal';
import { VictoryModal } from './components/modals/VictoryModal';
import { useGameStore } from './store/useGameStore';

export function App() {
  const [hintsOpen, setHintsOpen] = useState(false);
  const { runSimulation, selectNode, closeCoachModal, isCoachModalOpen } = useGameStore();

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
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
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
  );
}

export default App;
