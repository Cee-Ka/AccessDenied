import { useGameStore } from '../../store/useGameStore';
import {
  X,
  Sparkles,
  ShieldAlert,
  DollarSign,
  CheckCircle,
  Server,
  Archive,
  Database,
  Key,
  Shield,
  Cpu,
  Network,
  ArrowRight,
  Layers,
} from 'lucide-react';

export function MissionReportCardModal() {
  const { isReportCardOpen, closeReportCard, currentLevel } = useGameStore();

  if (!isReportCardOpen || !currentLevel.reportCard) return null;

  const card = currentLevel.reportCard;
  const newService = card.newService || currentLevel.newlyUnlockedService;

  const getServiceIcon = (type?: string) => {
    switch (type) {
      case 's3':
        return <Archive className="w-5 h-5 text-emerald-400" />;
      case 'ec2':
        return <Server className="w-5 h-5 text-orange-400" />;
      case 'iam_role':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'lambda':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'dynamodb':
        return <Database className="w-5 h-5 text-blue-400" />;
      case 'kms':
        return <Key className="w-5 h-5 text-amber-400" />;
      case 'vpc_endpoint':
      case 'nat_gw':
        return <Network className="w-5 h-5 text-cyan-400" />;
      default:
        return <Layers className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-sm">
              #{currentLevel.roundNumber}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Architecture Assignment Document
              </div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                {card.headline}
              </h2>
            </div>
          </div>
          <button
            onClick={closeReportCard}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {/* Scenario Overview */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Scenario & Workload
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {card.scenario}
            </p>
          </div>

          {/* Newly Unlocked Service Showcase (if any) */}
          {newService && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold uppercase tracking-wider">
                  New Service Unlocked in Dock
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Category: {newService.category}
                </span>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                  {getServiceIcon(newService.type)}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-100">{newService.name}</div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {newService.primer}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {newService.keyConcepts.map(c => (
                      <span
                        key={c}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Architecture Checklist / Tasks */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Architecture Tasks (To-Do)
            </div>

            <div className="space-y-2">
              {card.tasks.map(t => (
                <div
                  key={t.step}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {t.step}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-semibold text-slate-200 text-xs">{t.title}</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      {t.instruction}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Warning & Budget Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                Security Threat Intel
              </div>
              <p className="text-rose-200/90 text-[11px] leading-relaxed">
                {card.securityIntel}
              </p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Budget Cap Target
              </div>
              <p className="text-emerald-200/90 text-[11px] leading-relaxed">
                {card.budgetNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-[11px] font-mono text-slate-400">
            Target Budget: <span className="text-emerald-400 font-bold">${currentLevel.targetBudget}/mo</span>
          </div>

          <button
            onClick={closeReportCard}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all"
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
