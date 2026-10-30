import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { EssentialLockBadge, ServiceIconTile } from './NodeParts';
import { useGameStore } from '../../../store/useGameStore';

export const PrincipalNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);


  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative min-w-[200px] neo-card px-3.5 py-3 transition-[box-shadow,transform] cursor-pointer ${
        selected ? 'bg-neo-lilac neo-on-accent shadow-neo-lg -translate-x-0.5 -translate-y-0.5' : 'hover:shadow-neo-lg'
      }`}
    >
      <EssentialLockBadge data={data} />
      {/* Ingress Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-neo-orange border-2 border-neo-ink neo-on-accent"
      />

      <div className="flex items-center gap-2.5">
        <ServiceIconTile data={data} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-display font-extrabold text-neo-ink truncate">{data.label}</div>
          <div className="text-[10px] text-neo-muted font-mono">
            {data.monthlyCost > 0 ? `$${data.monthlyCost}/mo` : 'Free'}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
        <span className="neo-chip text-[9px] uppercase">
          {data.type.replace('_', ' ')}
        </span>

        {data.config?.imdsVersion && (
          <span
            className={`text-[9px] ${
              data.config.imdsVersion === 'v2'
                ? 'neo-badge-pass'
                : 'neo-badge-deny'
            }`}
          >
            IMDS{data.config.imdsVersion.toUpperCase()}
          </span>
        )}

        {data.permissionBoundary && (
          <span className="neo-badge-new text-[9px]">
            Boundary
          </span>
        )}

        {data.identityPolicies?.length > 0 && (
          <span className="neo-chip text-[9px]">
            {data.identityPolicies.length} {data.identityPolicies.length === 1 ? 'policy' : 'policies'}
          </span>
        )}
      </div>

      {/* Egress Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-neo-orange border-2 border-neo-ink neo-on-accent"
      />
    </div>
  );
});
PrincipalNode.displayName = 'PrincipalNode';
