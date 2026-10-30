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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl neo-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-ink bg-neo-bg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-neo bg-neo-raised border-2 border-neo-ink flex items-center justify-center shadow-neo-sm text-neo-ink font-bold text-sm">
              #{currentLevel.roundNumber}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-neo-ink font-bold">
                Architecture Mission Dossier
              </div>
              <h2 className="neo-heading text-base font-extrabold text-neo-ink tracking-tight">
                {card.headline}
              </h2>
            </div>
          </div>
          <button
            onClick={closeReportCard}
            className="neo-icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {/* Scenario Overview */}
          <div className="bg-neo-raised border-2 border-neo-ink rounded-neo p-4 space-y-1.5">
            <div className="text-[11px] font-bold text-neo-ink uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neo-ink" />
              Scenario & Workload
            </div>
            <p className="text-neo-muted leading-relaxed text-xs">
              {card.scenario}
            </p>
          </div>

          {/* Concepts this stage relies on */}
          {currentLevel.conceptTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-neo-ink uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-neo-ink" />
                Concepts in this stage
              </div>
              <ConceptTags ids={currentLevel.conceptTags} max={currentLevel.conceptTags.length} />
            </div>
          )}

          {/* Newly Unlocked Service Showcase (if any) */}
          {newService && (
            <div className="neo-inset rounded-neo p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 neo-badge-new uppercase tracking-wider">
                  New Service Unlocked in Dock
                </span>
                <span className="text-[10px] text-neo-muted font-mono">
                  Category: {newService.category}
                </span>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="w-10 h-10 rounded-neo bg-white border-2 border-neo-ink flex items-center justify-center shrink-0 shadow-neo-sm">
                  <AwsIcon type={newService.type} size={28} />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-neo-ink">{newService.name}</div>
                  <p className="text-neo-muted leading-relaxed text-xs">
                    {newService.primer}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {newService.keyConcepts.map(c => (
                      <span
                        key={c}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-neo-raised border-2 border-neo-ink text-neo-muted"
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
            <div className="text-[11px] font-bold text-neo-ink uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-neo-ink" />
              Architecture Tasks (To-Do)
            </div>

            <div className="space-y-2">
              {card.tasks.map(t => (
                <div
                  key={t.step}
                  className="bg-neo-raised border-2 border-neo-ink rounded-neo p-3 flex items-start gap-3 hover:border-neo-muted transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-neo-raised border-2 border-neo-ink text-neo-ink font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {t.step}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-neo-ink text-xs">{t.title}</div>
                    <div className="text-neo-muted text-[11px] leading-relaxed">
                      {t.instruction}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Warning & Budget Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-neo-coral border-2 border-neo-ink rounded-neo p-3 space-y-1 neo-on-accent">
              <div className="flex items-center gap-1.5 text-neo-ink font-bold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-neo-ink shrink-0" />
                Security Threat Intel
              </div>
              <p className="text-neo-muted text-[11px] leading-relaxed">
                {card.securityIntel}
              </p>
            </div>

            <div className="bg-neo-raised border-2 border-neo-ink rounded-neo p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-neo-ink font-bold text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-neo-ink shrink-0" />
                Budget Cap Target
              </div>
              <p className="text-neo-muted text-[11px] leading-relaxed">
                {card.budgetNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t-2 border-neo-ink bg-neo-bg">
          <div className="text-[11px] font-mono text-neo-muted">
            Target Budget: <span className="text-neo-ink font-bold">${currentLevel.targetBudget}/mo</span>
          </div>

          <button
            onClick={closeReportCard}
            className="neo-btn neo-btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
