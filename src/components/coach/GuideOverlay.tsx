import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, X, Hourglass } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { isStepComplete } from '../../onboarding/predicates';
import { InfoPopover } from '../common/InfoPopover';

const HIGHLIGHT = 'guide-highlight';

function findTarget(target: string | undefined): Element | null {
  if (!target) return null;
  if (target.startsWith('[')) return document.querySelector(target);
  return document.querySelector(`.react-flow__node[data-id="${CSS.escape(target)}"]`);
}

/**
 * Coach marks for levels with onboarding steps (Round 0). The card sits in a
 * corner and only the card takes pointer events, so the board stays usable.
 */
export function GuideOverlay() {
  const {
    currentLevel,
    currentLevelId,
    isGuideOpen,
    isReportCardOpen,
    isWelcomeOpen,
    onboarding,
    nodes,
    edges,
    selectedNodeId,
    results,
    simStatus,
    setGuideStep,
    completeGuide,
    exitGuide,
    showToast,
  } = useGameStore();

  const steps = currentLevel.onboardingSteps ?? [];
  const index = Math.min(onboarding.currentStep[currentLevelId] ?? 0, Math.max(0, steps.length - 1));
  const step = steps[index];
  const visible = isGuideOpen && !isReportCardOpen && !isWelcomeOpen && Boolean(step);

  // Advance automatically once the current step's action is done.
  useEffect(() => {
    if (!visible || !step) return;
    if (isStepComplete(step, { nodes, edges, selectedNodeId, results, simStatus })) {
      if (index >= steps.length - 1) {
        completeGuide();
        showToast('Guide complete. You know the building blocks. Round 1 is next.', 'success');
      } else {
        setGuideStep(index + 1);
      }
    }
  }, [visible, step, index, steps.length, nodes, edges, selectedNodeId, results, simStatus, setGuideStep, completeGuide, showToast]);

  // Keep the highlight on the target, even as the inspector opens and closes.
  useEffect(() => {
    if (!visible) return;
    let current: Element | null = null;
    const apply = () => {
      const el = findTarget(step?.target);
      if (el === current) return;
      current?.classList.remove(HIGHLIGHT);
      el?.classList.add(HIGHLIGHT);
      current = el;
    };
    apply();
    const timer = setInterval(apply, 400);
    return () => {
      clearInterval(timer);
      current?.classList.remove(HIGHLIGHT);
    };
  }, [visible, step?.target]);

  if (!visible || !step) return null;

  const waiting = Boolean(step.completeWhen);

  return (
    // Bottom-right keeps the card off the nodes (levels lay out left to right); it
    // moves left of the inspector drawer when a node is selected.
    <div
      className={`fixed bottom-4 z-[45] w-[340px] max-w-[calc(100vw-2rem)] transition-[right] duration-200 ${selectedNodeId ? 'right-[25rem]' : 'right-4'}`}
      role="dialog"
      aria-label="Guide"
    >
      <div className="rounded-2xl border-2 border-brand-orange/70 bg-obsidian-900 shadow-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-brand-orange font-bold">
            <GraduationCap className="w-3.5 h-3.5" />
            Step {index + 1} of {steps.length}
          </div>
          <button onClick={exitGuide} className="text-obsidian-muted hover:text-obsidian-text" aria-label="Leave guide" title="Leave guide (resume from the top bar)">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-1 rounded-full bg-obsidian-850 overflow-hidden" aria-hidden>
          <div className="h-full bg-brand-orange transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-obsidian-text">{step.title}</h3>
          {step.conceptId && <InfoPopover conceptId={step.conceptId} />}
        </div>
        <p className="text-xs text-obsidian-muted leading-relaxed">{step.body}</p>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setGuideStep(index - 1)}
            disabled={index === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-obsidian-muted hover:text-obsidian-text disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          {waiting ? (
            <span className="flex items-center gap-1 text-[11px] text-obsidian-muted">
              <Hourglass className="w-3.5 h-3.5 text-brand-orange" /> Waiting for you…
            </span>
          ) : (
            <button
              onClick={() => (index >= steps.length - 1 ? completeGuide() : setGuideStep(index + 1))}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-orange hover:bg-brand-hover text-black text-xs font-bold"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
