import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';

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
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isSimulating = Boolean(data?.isSimulating);
  const isExploit = Boolean(data?.isExploit);
  const speed = (data?.speed as number) || 0.7;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isSimulating ? (isExploit ? '#ef4444' : '#10b981') : '#334155',
          strokeWidth: isSimulating ? 3 : 2,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {isSimulating && (
        <circle r="6" fill={isExploit ? '#ef4444' : '#10b981'}>
          <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900/90 text-slate-300 border border-slate-700 shadow-md backdrop-blur-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
