import { useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useGameStore, ReturnOutcome } from '../../../store/useGameStore';
import { X, ArrowLeftRight } from 'lucide-react';

// Squid & Smile roles: ink idle, lilac selected, orange legit, coral exploit.
const COLOR = {
  ink: 'var(--neo-ink)',
  idle: 'var(--neo-ink)',
  selected: 'var(--neo-lilac)',
  legit: 'var(--neo-orange)',
  exploit: 'var(--neo-coral)',
  threat: 'var(--neo-coral)',
  allow: 'var(--neo-lime)',
  deny: 'var(--neo-coral)',
  timeout: 'var(--neo-yellow)',
};

/**
 * A packet dot that travels the edge once. SMIL animations with the default
 * begin time are timed from document load, so a dot inserted mid-session
 * would already be "finished"; start each one explicitly when it mounts.
 */
function PacketDot({ path, dur, reverse, fill, stroke = COLOR.ink }: { path: string; dur: number; reverse?: boolean; fill: string; stroke?: string }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    motionRef.current?.beginElement();
    // Hidden until the motion has started, so it never flashes at the SVG origin.
    circleRef.current?.setAttribute('opacity', '1');
  }, []);
  return (
    <circle ref={circleRef} r="7" fill={fill} stroke={stroke} strokeWidth={2.5} opacity={0}>
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
  const emphasized = strokeColor !== COLOR.idle;
  const width = selected || isSimulating ? 3.5 : 2.5;

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
          <path d="M 1 1 L 11 6 L 1 11 z" fill={strokeColor} stroke={COLOR.ink} strokeWidth={emphasized ? 1.5 : 0} strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Colored edges sit on an ink underlay so they read on any background. */}
      {emphasized && (
        <path d={edgePath} fill="none" stroke={COLOR.ink} strokeWidth={width + 3} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        interactionWidth={24}
        style={{
          stroke: strokeColor,
          strokeWidth: width,
          strokeDasharray: isThreatEdge && !isSimulating && !selected ? '8,5' : undefined,
          strokeLinecap: 'round',
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
          fill={hollow ? 'var(--neo-surface)' : returnColor}
          stroke={hollow ? returnColor : COLOR.ink}
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
              className={
                returnOutcome === 'allow' ? 'neo-badge-pass' : returnOutcome === 'timeout' ? 'neo-badge-new' : 'neo-badge-deny'
              }
            >
              {returnLabel}
            </span>
          )}

          {label && (
            <span
              className={`neo-chip select-none shadow-neo-sm ${
                selected ? 'bg-neo-lilac neo-on-accent' : isThreatEdge ? 'bg-neo-coral neo-on-accent' : ''
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
            className={`w-6 h-6 rounded-sm bg-neo-surface border-2 border-neo-ink text-neo-ink hover:bg-neo-sky flex items-center justify-center shadow-neo-sm ${
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
            className={`w-6 h-6 rounded-sm bg-neo-surface border-2 border-neo-ink text-neo-ink hover:bg-neo-coral flex items-center justify-center shadow-neo-sm ${
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
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
