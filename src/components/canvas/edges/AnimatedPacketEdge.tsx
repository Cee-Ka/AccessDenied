import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useGameStore } from '../../../store/useGameStore';
import { X } from 'lucide-react';

export function AnimatedPacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
}: EdgeProps) {
  const theme = useGameStore(s => s.theme);
  const removeEdge = useGameStore(s => s.removeEdge);

  // Guard against unmeasured coordinates during initial layout render
  if (
    typeof sourceX !== 'number' ||
    typeof sourceY !== 'number' ||
    typeof targetX !== 'number' ||
    typeof targetY !== 'number' ||
    Number.isNaN(sourceX) ||
    Number.isNaN(sourceY) ||
    Number.isNaN(targetX) ||
    Number.isNaN(targetY)
  ) {
    return null;
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!edgePath || Number.isNaN(labelX) || Number.isNaN(labelY)) {
    return null;
  }

  const isSimulating = Boolean(data?.isSimulating);
  const isExploit = Boolean(data?.isExploit);
  const isThreatEdge = Boolean(data?.isThreat);
  const speed = (data?.speed as number) || 0.7;

  // Compute stroke styling
  let strokeColor = theme === 'dark' ? '#3f3f46' : '#94a3b8';
  if (selected) {
    strokeColor = '#ff9900';
  } else if (isSimulating) {
    strokeColor = isExploit ? '#ef4444' : '#ff9900';
  } else if (isThreatEdge) {
    strokeColor = '#f43f5e';
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={24}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || isSimulating ? 3 : 2,
          strokeDasharray: isThreatEdge && !isSimulating ? '5,5' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {isSimulating && (
        <circle r="6" fill={isExploit ? '#ef4444' : '#ff9900'} className="animate-pulse">
          <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1 group z-10"
        >
          {label && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono shadow-sm select-none transition-colors ${
                selected
                  ? 'bg-brand-orange text-black font-bold border border-brand-orange'
                  : isThreatEdge
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-obsidian-900 text-obsidian-text border border-obsidian-border'
              }`}
            >
              {label}
            </span>
          )}

          {/* Interactive Delete Button (visible on edge hover or when selected) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeEdge(id);
            }}
            className={`w-5 h-5 rounded-full bg-obsidian-900 border border-obsidian-border hover:border-rose-500 hover:bg-rose-500/20 text-obsidian-muted hover:text-rose-500 flex items-center justify-center transition-all shadow-md ${
              selected
                ? 'opacity-100 scale-105 border-brand-orange ring-1 ring-brand-orange/40'
                : 'opacity-0 group-hover:opacity-100 hover:scale-110'
            }`}
            title="Delete Connection Edge (Backspace / Delete)"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
