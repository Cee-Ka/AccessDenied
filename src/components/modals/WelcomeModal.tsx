import { useState } from 'react';
import { Shield, PencilRuler, Play, Wrench, ArrowRight } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const LOOP = [
  { icon: PencilRuler, title: 'Build', body: 'Wire AWS parts on the board and write their policies.' },
  { icon: Play, title: 'Run', body: 'Press Simulate. Green requests must pass. Red attacks must be blocked.' },
  { icon: Wrench, title: 'Fix', body: 'Something broke? The coach shows the exact check that failed. Fix it and run again.' },
];

export function WelcomeModal() {
  const isWelcomeOpen = useGameStore(s => s.isWelcomeOpen);
  const completeWelcome = useGameStore(s => s.completeWelcome);
  const [name, setName] = useState('');

  if (!isWelcomeOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-scrim " role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-lg neo-modal p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-neo bg-neo-raised border-2 border-neo-ink flex items-center justify-center">
            <Shield className="w-5 h-5 text-neo-ink" />
          </div>
          <div>
            <h2 id="welcome-title" className="neo-heading text-lg font-extrabold text-neo-ink tracking-tight">
              Welcome to Access<span className="text-neo-ink">Denied</span>
            </h2>
            <p className="text-xs text-neo-muted">Learn AWS security by fixing broken cloud setups.</p>
          </div>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LOOP.map((step, i) => (
            <li key={step.title} className="bg-neo-raised border-2 border-neo-ink rounded-neo p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neo-ink">
                <span className="w-5 h-5 rounded-sm bg-neo-orange text-neo-on-accent text-[10px] font-extrabold flex items-center justify-center neo-on-accent">{i + 1}</span>
                <step.icon className="w-3.5 h-3.5 text-neo-ink" />
                {step.title}
              </div>
              <p className="text-[11px] text-neo-muted leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-neo-ink">What should we call you? <span className="text-neo-muted font-normal">(optional, stays on this device)</span></span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            className="neo-input w-full text-sm"
          />
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => completeWelcome({ displayName: name, startTutorial: true })}
            className="neo-btn neo-btn-primary text-sm flex-1 flex items-center justify-center gap-2 px-4 py-2.5"
          >
            Start with Level 1.1: Hello Cloud
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => completeWelcome({ displayName: name, startTutorial: false })}
            className="neo-btn neo-btn-secondary px-4 py-2.5 text-sm"
          >
            Skip, I know IAM
          </button>
        </div>
      </div>
    </div>
  );
}
