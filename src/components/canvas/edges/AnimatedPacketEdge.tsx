import { useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useGameStore, ReturnOutcome } from '../../../store/useGameStore';
import { X, ArrowLeftRight } from 'lucide-react';

const COLOR = {
  idle: 'var(--color-edge)',
  selected: '#ff9900',
  legit: '#ff9900',
  exploit: 'var(--color-exploit)',
  threat: 'var(--color-exploit)',
  allow: 'var(--color-success)',
  deny: 'var(--color-exploit)',
  timeout: 'var(--color-warning)',
};

/**
 * A packet dot that travels the edge once. SMIL animations with the default
 * begin time are timed from document load, so a dot inserted mid-session
 * would already be "finished"; start each one explicitly when it mounts.
 */
function PacketDot({ path, dur, reverse, fill, stroke }: { path: string; dur: number; reverse?: boolean; fill: string; stroke?: string }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    motionRef.current?.beginElement();
    // Hidden until the motion has started, so it never flashes at the SVG origin.
    circleRef.current?.setAttribute('opacity', '1');
  }, []);
  return (
    <circle ref={circleRef} r="6" fill={fill} stroke={stroke} strokeWidth={stroke ? 2.5 : 0} opacity={0}>
      <animateMotion
        ref={motionRef}
        begin="indefinite"
        dur={`${dur}s`}
        repeatCount="1"
        fill="freeze"
        path={path}
        {...(reverse ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {})}
      />
    </circle>
  );
}

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
  const removeEdge = useGameStore(s => s.removeEdge);
  const reverseEdge = useGameStore(s => s.reverseEdge);

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
  const returnOutcome = data?.returnOutcome as ReturnOutcome | undefined;
  const returnLabel = data?.returnLabel as string | undefined;

  // Compute stroke styling
  let strokeColor = COLOR.idle;
  if (selected) {
    strokeColor = COLOR.selected;
  } else if (isSimulating) {
    strokeColor = isExploit ? COLOR.exploit : COLOR.legit;
  } else if (isThreatEdge) {
    strokeColor = COLOR.threat;
  }

  const markerId = `arrow-${id}`;
  const returnColor = returnOutcome ? COLOR[returnOutcome] : COLOR.idle;
  // Denied and timed-out answers travel back hollow; allowed answers are filled.
  const hollow = returnOutcome === 'deny' || returnOutcome === 'timeout';

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="14"
          markerHeight="14"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 12 6 L 0 12 z" fill={strokeColor} style={{ transition: 'fill 0.2s' }} />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        interactionWidth={24}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || isSimulating ? 3 : 2,
          strokeDasharray: isThreatEdge && !isSimulating ? '5,5' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {isSimulating && !returnOutcome && (
        <PacketDot key={`fwd-${speed}`} path={edgePath} dur={speed / 2} fill={isExploit ? COLOR.exploit : COLOR.legit} />
      )}

      {isSimulating && returnOutcome && (
        <PacketDot
          key={`ret-${returnOutcome}`}
          path={edgePath}
          dur={speed / 2}
          reverse
          fill={hollow ? 'var(--color-obsidian-950)' : returnColor}
          stroke={returnColor}
        />
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
          {isSimulating && returnLabel && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold border shadow-sm ${
                returnOutcome === 'allow'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  : returnOutcome === 'timeout'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
              }`}
            >
              {returnLabel}
            </span>
          )}

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

          {/* Reverse direction (visible on edge hover or when selected) */}
          <button
            onClick={e => {
              e.stopPropagation();
              reverseEdge(id);
            }}
            className={`w-5 h-5 rounded-full bg-obsidian-900 border border-obsidian-border hover:border-brand-orange text-obsidian-muted hover:text-brand-orange flex items-center justify-center transition-all shadow-md ${
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
            }`}
            title="Reverse direction"
            aria-label="Reverse connection direction"
          >
            <ArrowLeftRight className="w-3 h-3 stroke-[2.5]" />
          </button>

          {/* Interactive Delete Button (visible on edge hover or when selected) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeEdge(id);
            }}
            className={`w-5 h-5 rounded-full bg-obsidian-900 border border-obsidian-border hover:border-rose-500 hover:bg-rose-500/20 text-obsidian-muted hover:text-rose-500 flex items-center justify-center transition-all shadow-md ${
              selected
                ? 'opacity-100 scale-105 border-brand-orange ring-1 ring-brand-orange/40'
                : 'opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110'
            }`}
            title="Delete Connection Edge (Backspace / Delete)"
            aria-label="Delete connection"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
