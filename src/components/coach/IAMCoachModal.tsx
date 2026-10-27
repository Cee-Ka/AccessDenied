import { useGameStore } from '../../store/useGameStore';
import { X, CheckCircle2, XCircle, AlertTriangle, ShieldX, ArrowRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                IAM Coach — Diagnostic Report
              </h2>
              <p className="text-xs text-slate-400">
                Evaluating {currentPacket.kind === 'exploit' ? 'Adversary Exploit' : 'Business Workload'}: <span className="text-amber-400 font-medium">{currentPacket.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={closeCoachModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failure Summary Banner */}
        <div className="px-6 py-3 bg-rose-950/30 border-b border-rose-900/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="text-xs text-rose-200">
            <span className="font-semibold">Outcome: {inspectedResult.outcome}</span> —{' '}
            {inspectedResult.failureReason || 'Evaluation failed to satisfy permission criteria.'}
          </div>
        </div>

        {/* Trace List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
                      : isPass
                      ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                      : 'bg-slate-950/40 border-slate-900 text-slate-400'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isDenied ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-500">
                        —
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400 font-mono">
                        {trace.stage.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        isDenied
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : isPass
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {trace.status}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {trace.summary}
                    </p>

                    {trace.matchedStatement && (
                      <div className="mt-2 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
                        <div className="text-slate-400 text-[9px] uppercase mb-1">Triggering Statement:</div>
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-[11px] text-slate-400">
            Source: <span className="font-mono text-slate-200">{currentPacket.sourceNodeId}</span> &rarr; Target: <span className="font-mono text-slate-200">{currentPacket.targetNodeId}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentPacket.targetNodeId && (
              <button
                onClick={() => {
                  selectNode(currentPacket.targetNodeId);
                  closeCoachModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                Inspect Target Node
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeCoachModal}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
