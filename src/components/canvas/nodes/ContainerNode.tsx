import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { AwsIcon } from '@access-denied/aws-icons';
import { EssentialLockBadge } from './NodeParts';
import { useGameStore } from '../../../store/useGameStore';

export const ContainerNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);

  const getBorderColor = () => {
    if (selected) return 'border-brand-orange ring-2 ring-brand-orange/40 shadow-lg shadow-orange-500/10';
    if (data.type === 'aws_account') return 'border-obsidian-border bg-obsidian-850/40';
    if (data.type === 'vpc') return 'border-brand-orange/40 bg-orange-500/5';
    if (data.config?.inPrivateSubnet) return 'border-obsidian-border bg-obsidian-800/40';
    return 'border-obsidian-border bg-obsidian-850/30';
  };


  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative min-w-[340px] min-h-[220px] rounded-2xl border-2 border-dashed p-4 shadow-sm transition-all cursor-pointer ${getBorderColor()}`}
    >
      <EssentialLockBadge data={data} />
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-obsidian-border">
        <div className="flex items-center gap-2">
          <AwsIcon type={data.type} privateSubnet={data.config?.inPrivateSubnet} size={20} />
          <span className="text-xs font-bold uppercase tracking-wider text-obsidian-text">
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-obsidian-muted">{data.arn}</span>
      </div>
    </div>
  );
});
ContainerNode.displayName = 'ContainerNode';
