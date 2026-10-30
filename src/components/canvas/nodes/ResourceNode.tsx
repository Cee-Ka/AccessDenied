import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { EssentialLockBadge, ServiceIconTile } from './NodeParts';
import { useGameStore } from '../../../store/useGameStore';

export const ResourceNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);


  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative min-w-[200px] rounded-xl border bg-obsidian-900/95 backdrop-blur-md px-3.5 py-3 shadow-xl transition-all cursor-pointer ${
        selected
          ? 'border-brand-orange ring-2 ring-brand-orange/40 shadow-xl shadow-orange-500/20'
          : 'border-obsidian-border hover:border-obsidian-muted'
      }`}
    >
      <EssentialLockBadge data={data} />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-brand-orange border-2 border-obsidian-900 hover:scale-125 transition-transform"
      />

      <div className="flex items-center gap-2.5">
        <ServiceIconTile data={data} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-obsidian-text truncate">{data.label}</div>
          <div className="text-[10px] text-obsidian-muted font-mono">${data.monthlyCost}/mo</div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-obsidian-box text-obsidian-muted border border-obsidian-border">
          {data.type}
        </span>

        {data.type === 's3' && (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              data.config?.blockPublicAccess
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
            }`}
          >
            {data.config?.blockPublicAccess ? 'Public Block ON' : 'Public Block OFF'}
          </span>
        )}

        {data.resourcePolicy && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-brand-orange border border-brand-orange/30">
            Resource Policy
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-brand-orange border-2 border-obsidian-900 hover:scale-125 transition-transform"
      />
    </div>
  );
});
ResourceNode.displayName = 'ResourceNode';
