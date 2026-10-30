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
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-scrim backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-lg bg-obsidian-900 border border-obsidian-border rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-obsidian-box border border-brand-orange/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h2 id="welcome-title" className="text-lg font-extrabold text-obsidian-text tracking-tight">
              Welcome to Access<span className="text-brand-orange">Denied</span>
            </h2>
            <p className="text-xs text-obsidian-muted">Learn AWS security by fixing broken cloud setups.</p>
          </div>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LOOP.map((step, i) => (
            <li key={step.title} className="bg-obsidian-box border border-obsidian-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-obsidian-text">
                <span className="w-5 h-5 rounded-md bg-brand-orange text-black text-[10px] font-extrabold flex items-center justify-center">{i + 1}</span>
                <step.icon className="w-3.5 h-3.5 text-brand-orange" />
                {step.title}
              </div>
              <p className="text-[11px] text-obsidian-muted leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-obsidian-text">What should we call you? <span className="text-obsidian-muted font-normal">(optional, stays on this device)</span></span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            className="w-full bg-obsidian-box border border-obsidian-border rounded-lg px-3 py-2 text-sm text-obsidian-text placeholder-obsidian-muted focus:outline-none focus:border-brand-orange"
          />
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => completeWelcome({ displayName: name, startTutorial: true })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-hover text-black text-sm font-bold shadow-lg"
          >
            Start with Round 0: Cloud Basics
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => completeWelcome({ displayName: name, startTutorial: false })}
            className="px-4 py-2.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-obsidian-text border border-obsidian-border text-sm font-semibold"
          >
            Skip, I know IAM
          </button>
        </div>
      </div>
    </div>
  );
}
