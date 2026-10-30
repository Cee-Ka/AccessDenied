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
      <div className="neo-modal bg-neo-sky neo-on-accent p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-neo-ink font-bold">
            <GraduationCap className="w-3.5 h-3.5" />
            Step {index + 1} of {steps.length}
          </div>
          <button onClick={exitGuide} className="neo-icon-btn w-6 h-6" aria-label="Leave guide" title="Leave guide (resume from the top bar)">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-2.5 rounded-sm border-2 border-neo-ink bg-neo-surface overflow-hidden" aria-hidden>
          <div className="h-full bg-neo-orange border-r-2 border-neo-ink transition-all neo-on-accent" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="flex items-center gap-1.5">
          <h3 className="neo-heading text-base">{step.title}</h3>
          {step.conceptId && <InfoPopover conceptId={step.conceptId} />}
        </div>
        <p className="text-xs text-neo-muted leading-relaxed">{step.body}</p>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setGuideStep(index - 1)}
            disabled={index === 0}
            className="neo-btn neo-btn-ghost px-2.5 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          {waiting ? (
            <span className="flex items-center gap-1 text-[11px] text-neo-muted">
              <Hourglass className="w-3.5 h-3.5 text-neo-ink" /> Waiting for you…
            </span>
          ) : (
            <button
              onClick={() => (index >= steps.length - 1 ? completeGuide() : setGuideStep(index + 1))}
              className="neo-btn neo-btn-primary flex items-center gap-1 px-3 py-1"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
