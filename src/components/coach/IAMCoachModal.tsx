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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-obsidian-900 border border-obsidian-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-obsidian-border bg-obsidian-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-obsidian-box border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-md">
              <ShieldX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-obsidian-text flex items-center gap-2">
                IAM Coach — Diagnostic Report
              </h2>
              <p className="text-xs text-obsidian-muted">
                Evaluating {currentPacket.kind === 'exploit' ? 'Adversary Exploit' : 'Business Workload'}: <span className="text-brand-orange font-semibold">{currentPacket.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={closeCoachModal}
            className="p-1.5 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failure Summary Banner */}
        <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <div className="text-xs text-rose-600 dark:text-rose-300">
            <span className="font-bold">Outcome: {inspectedResult.outcome}</span> —{' '}
            {inspectedResult.failureReason || 'Evaluation failed to satisfy permission criteria.'}
          </div>
        </div>

        {/* Trace List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="text-xs font-bold text-obsidian-text uppercase tracking-wider mb-2">
            Evaluation Pipeline Trace
          </div>

          <div className="space-y-2">
            {traces.map((trace, idx) => {
              const isPass = trace.status === 'PASS';
              const isDenied = trace.status === 'DENIED' || trace.status === 'FAIL';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                    isDenied
                      ? 'bg-rose-500/5 border-rose-500/30 text-rose-600 dark:text-rose-200'
                      : isPass
                      ? 'bg-obsidian-box border-obsidian-border text-obsidian-text'
                      : 'bg-obsidian-box border-obsidian-border/50 text-obsidian-muted'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isDenied ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-orange" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-obsidian-border flex items-center justify-center text-[9px] text-obsidian-muted">
                        —
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-brand-orange font-mono">
                          {trace.stage.replace(/_/g, ' ')}
                        </span>
                        <InfoPopover conceptId={STAGE_CONCEPT[trace.stage]} />
                      </span>

                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isDenied
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
                          : isPass
                          ? 'bg-orange-500/10 text-brand-orange border-brand-orange/40 font-bold'
                          : 'bg-obsidian-box text-obsidian-muted border-obsidian-border'
                      }`}>
                        {trace.status}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-obsidian-muted">
                      {trace.summary}
                    </p>

                    {trace.matchedStatement && (
                      <div className="mt-2 bg-obsidian-950 p-2 rounded-lg border border-obsidian-border font-mono text-[10px] text-obsidian-text overflow-x-auto">
                        <div className="text-obsidian-muted text-[9px] uppercase mb-1">Triggering Statement:</div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-obsidian-border bg-obsidian-950">
          <div className="text-[11px] text-obsidian-muted">
            Source: <span className="font-mono text-obsidian-text">{currentPacket.sourceNodeId}</span> &rarr; Target: <span className="font-mono text-obsidian-text">{currentPacket.targetNodeId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <AskAgentButton />
            {currentPacket.targetNodeId && (
              <button
                onClick={() => {
                  selectNode(currentPacket.targetNodeId);
                  closeCoachModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-xs font-semibold text-obsidian-text border border-obsidian-border transition-colors whitespace-nowrap"
              >
                Inspect Target Node
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeCoachModal}
              className="whitespace-nowrap px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
