import { useGameStore } from '../../store/useGameStore';
import { X, Sparkles, ShieldAlert, DollarSign, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { AwsIcon } from '@access-denied/aws-icons';
import { ConceptTags } from '../hud/LevelPicker';

export function MissionReportCardModal() {
  const { isReportCardOpen, closeReportCard, currentLevel } = useGameStore();

  if (!isReportCardOpen || !currentLevel.reportCard) return null;

  const card = currentLevel.reportCard;
  const newService = card.newService || currentLevel.newlyUnlockedService;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-obsidian-900 border border-obsidian-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-obsidian-border bg-obsidian-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-obsidian-box border border-brand-orange/40 flex items-center justify-center shadow-lg shadow-orange-500/10 text-brand-orange font-bold text-sm">
              #{currentLevel.roundNumber}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-brand-orange font-bold">
                Architecture Mission Dossier
              </div>
              <h2 className="text-base font-extrabold text-obsidian-text tracking-tight">
                {card.headline}
              </h2>
            </div>
          </div>
          <button
            onClick={closeReportCard}
            className="p-1.5 rounded-xl text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {/* Scenario Overview */}
          <div className="bg-obsidian-box border border-obsidian-border rounded-2xl p-4 space-y-1.5">
            <div className="text-[11px] font-bold text-obsidian-text uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
              Scenario & Workload
            </div>
            <p className="text-obsidian-muted leading-relaxed text-xs">
              {card.scenario}
            </p>
          </div>

          {/* Concepts this stage relies on */}
          {currentLevel.conceptTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-obsidian-text uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-orange" />
                Concepts in this stage
              </div>
              <ConceptTags ids={currentLevel.conceptTags} max={currentLevel.conceptTags.length} />
            </div>
          )}

          {/* Newly Unlocked Service Showcase (if any) */}
          {newService && (
            <div className="bg-gradient-to-r from-orange-500/10 via-obsidian-box to-obsidian-box border border-brand-orange/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-brand-orange text-black font-extrabold uppercase tracking-wider">
                  New Service Unlocked in Dock
                </span>
                <span className="text-[10px] text-obsidian-muted font-mono">
                  Category: {newService.category}
                </span>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="w-10 h-10 rounded-xl bg-white border border-brand-orange/30 flex items-center justify-center shrink-0 shadow-md">
                  <AwsIcon type={newService.type} size={28} />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-obsidian-text">{newService.name}</div>
                  <p className="text-obsidian-muted leading-relaxed text-xs">
                    {newService.primer}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {newService.keyConcepts.map(c => (
                      <span
                        key={c}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-obsidian-850 border border-obsidian-border text-obsidian-muted"
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
            <div className="text-[11px] font-bold text-obsidian-text uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-brand-orange" />
              Architecture Tasks (To-Do)
            </div>

            <div className="space-y-2">
              {card.tasks.map(t => (
                <div
                  key={t.step}
                  className="bg-obsidian-box border border-obsidian-border rounded-xl p-3 flex items-start gap-3 hover:border-obsidian-muted transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-obsidian-850 border border-brand-orange/40 text-brand-orange font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {t.step}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-obsidian-text text-xs">{t.title}</div>
                    <div className="text-obsidian-muted text-[11px] leading-relaxed">
                      {t.instruction}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Warning & Budget Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-rose-500/5 border border-rose-500/20 dark:border-rose-900/40 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                Security Threat Intel
              </div>
              <p className="text-obsidian-muted text-[11px] leading-relaxed">
                {card.securityIntel}
              </p>
            </div>

            <div className="bg-obsidian-box border border-obsidian-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-brand-orange font-bold text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                Budget Cap Target
              </div>
              <p className="text-obsidian-muted text-[11px] leading-relaxed">
                {card.budgetNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-obsidian-border bg-obsidian-950/80">
          <div className="text-[11px] font-mono text-obsidian-muted">
            Target Budget: <span className="text-brand-orange font-bold">${currentLevel.targetBudget}/mo</span>
          </div>

          <button
            onClick={closeReportCard}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
