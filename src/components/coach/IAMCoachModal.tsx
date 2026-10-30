import { useGameStore } from '../../store/useGameStore';
import { X, CheckCircle2, XCircle, AlertTriangle, ShieldX, ArrowRight } from 'lucide-react';
import { InfoPopover } from '../common/InfoPopover';
import { STAGE_CONCEPT } from '../../content/concepts';
import { AskAgentButton } from './AskAgentPanel';

export function IAMCoachModal() {
  const {
    isCoachModalOpen,
    closeCoachModal,
    inspectedResult,
    currentLevel,
    selectNode,
  } = useGameStore();

  if (!isCoachModalOpen || !inspectedResult) return null;

  const currentPacket = currentLevel.packets.find(p => p.id === inspectedResult.packetId) || {
    name: 'Unknown Request',
    action: 'unknown',
    resourceArn: 'unknown',
    kind: 'legitimate',
    description: '',
    sourceNodeId: '',
    targetNodeId: '',
  };

  const traces = inspectedResult.traces || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl neo-modal overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-ink bg-neo-bg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-neo bg-neo-raised border-2 border-neo-ink flex items-center justify-center text-neo-ink shadow-neo-sm">
              <ShieldX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="neo-heading text-sm font-bold text-neo-ink flex items-center gap-2">
                IAM Coach — Diagnostic Report
              </h2>
              <p className="text-xs text-neo-muted">
                Evaluating {currentPacket.kind === 'exploit' ? 'Adversary Exploit' : 'Business Workload'}: <span className="text-neo-ink font-semibold">{currentPacket.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={closeCoachModal}
            className="neo-icon-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failure Summary Banner */}
        <div className="px-6 py-3 bg-neo-coral border-b-2 border-neo-ink flex items-center gap-3 neo-on-accent">
          <AlertTriangle className="w-4 h-4 text-neo-ink shrink-0" />
          <div className="text-xs text-neo-ink ">
            <span className="font-bold">Outcome: {inspectedResult.outcome}</span> —{' '}
            {inspectedResult.failureReason || 'Evaluation failed to satisfy permission criteria.'}
          </div>
        </div>

        {/* Trace List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="text-xs font-bold text-neo-ink uppercase tracking-wider mb-2">
            Evaluation Pipeline Trace
          </div>

          <div className="space-y-2">
            {traces.map((trace, idx) => {
              const isPass = trace.status === 'PASS';
              const isDenied = trace.status === 'DENIED' || trace.status === 'FAIL';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded border-2 border-neo-ink text-xs flex items-start gap-3 ${
                    isDenied
                      ? 'bg-neo-coral neo-on-accent shadow-neo-sm'
                      : isPass
                      ? 'bg-neo-lime neo-on-accent'
                      : 'bg-neo-raised text-neo-muted border-dashed'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isDenied ? (
                      <XCircle className="w-4 h-4 text-neo-ink" />
                    ) : isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-neo-ink" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-neo-ink flex items-center justify-center text-[9px] text-neo-muted">
                        —
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-neo-ink font-mono">
                          {trace.stage.replace(/_/g, ' ')}
                        </span>
                        <InfoPopover conceptId={STAGE_CONCEPT[trace.stage]} />
                      </span>

                      <span className={`neo-chip ${isDenied || isPass ? 'bg-neo-surface' : 'text-neo-muted'}`}>
                        {trace.status}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-neo-muted">
                      {trace.summary}
                    </p>

                    {trace.matchedStatement && (
                      <div className="mt-2 bg-neo-bg p-2 rounded border-2 border-neo-ink font-mono text-[10px] text-neo-ink overflow-x-auto">
                        <div className="text-neo-muted text-[9px] uppercase mb-1">Triggering Statement:</div>
                        <pre>{JSON.stringify(trace.matchedStatement, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t-2 border-neo-ink bg-neo-bg">
          <div className="text-[11px] text-neo-muted">
            Source: <span className="font-mono text-neo-ink">{currentPacket.sourceNodeId}</span> &rarr; Target: <span className="font-mono text-neo-ink">{currentPacket.targetNodeId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <AskAgentButton />
            {currentPacket.targetNodeId && (
              <button
                onClick={() => {
                  selectNode(currentPacket.targetNodeId);
                  closeCoachModal();
                }}
                className="neo-btn neo-btn-secondary flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap"
              >
                Inspect Target Node
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeCoachModal}
              className="neo-btn neo-btn-primary whitespace-nowrap px-4 py-1.5"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
