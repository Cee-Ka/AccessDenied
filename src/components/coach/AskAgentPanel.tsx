import { useMemo, useRef, useState } from 'react';
import { Bot, Copy, Check, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { buildTutorPrompt } from '../../tutor/buildTutorPrompt';

/** Button that opens the panel; disabled until a run describes the current board. */
export function AskAgentButton({ className = '' }: { className?: string }) {
  const resultsCurrent = useGameStore(s => s.resultsCurrent);
  const openAskAgent = useGameStore(s => s.openAskAgent);
  return (
    <button
      onClick={openAskAgent}
      disabled={!resultsCurrent}
      title={resultsCurrent ? 'Copy a tutor prompt for your own AI assistant' : 'Run the simulation first'}
      className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-xs font-semibold text-obsidian-text border border-obsidian-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <Bot className="w-3.5 h-3.5 text-brand-orange" />
      Ask your agent
    </button>
  );
}

export function AskAgentPanel() {
  const {
    isAskAgentOpen,
    closeAskAgent,
    currentLevel,
    nodes,
    edges,
    results,
    lastRunStars,
    showToast,
  } = useGameStore();
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const prompt = useMemo(
    () =>
      isAskAgentOpen
        ? buildTutorPrompt({
            level: currentLevel,
            nodes: nodes.map(n => n.data),
            edges: edges.map(e => ({ source: e.source, target: e.target })),
            packets: currentLevel.packets,
            results,
            earnedStars: lastRunStars,
          })
        : '',
    [isAskAgentOpen, currentLevel, nodes, edges, results, lastRunStars]
  );

  if (!isAskAgentOpen) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      showToast('Prompt copied. Paste it into your AI assistant.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      textRef.current?.focus();
      textRef.current?.select();
      showToast('Clipboard access was blocked. The prompt is selected: press Ctrl/⌘+C to copy it.', 'warn');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-scrim backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ask-agent-title">
      <div className="w-full max-w-2xl bg-obsidian-900 border border-obsidian-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-obsidian-border">
          <div>
            <h2 id="ask-agent-title" className="text-sm font-bold text-obsidian-text flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand-orange" /> Ask your agent
            </h2>
            <p className="text-[11px] text-obsidian-muted">
              Paste this into your own AI assistant. It explains what happened without giving away the fix. The game does not send it anywhere.
            </p>
          </div>
          <button onClick={closeAskAgent} className="p-1.5 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            ref={textRef}
            readOnly
            value={prompt}
            aria-label="Tutor prompt"
            className="w-full h-[50vh] resize-none bg-obsidian-box border border-obsidian-border rounded-lg p-3 font-mono text-[11px] text-obsidian-text focus:outline-none focus:border-brand-orange select-text"
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-obsidian-border">
          <span className="text-[11px] text-obsidian-muted font-mono">{prompt.length.toLocaleString()} characters</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-hover text-black text-xs font-bold shadow-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
