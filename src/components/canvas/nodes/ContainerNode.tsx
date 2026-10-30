import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { AwsIcon } from '@access-denied/aws-icons';
import { EssentialLockBadge } from './NodeParts';
import { useGameStore } from '../../../store/useGameStore';

export const ContainerNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);

  const getBorderColor = () => {
    if (selected) return 'border-neo-ink border-solid bg-neo-lilac/40 shadow-neo';
    if (data.type === 'aws_account') return 'border-neo-ink bg-neo-raised';
    if (data.type === 'vpc') return 'border-neo-ink bg-neo-raised';
    if (data.config?.inPrivateSubnet) return 'border-neo-ink bg-neo-raised';
    return 'border-neo-ink bg-neo-raised';
  };


  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative min-w-[340px] min-h-[220px] rounded-neo border-3 border-dashed p-4 cursor-pointer ${getBorderColor()}`}
    >
      <EssentialLockBadge data={data} />
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-neo-ink">
        <div className="flex items-center gap-2">
          <AwsIcon type={data.type} privateSubnet={data.config?.inPrivateSubnet} size={20} />
          <span className="text-xs font-display font-extrabold uppercase tracking-wider text-neo-ink">
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-neo-muted">{data.arn}</span>
      </div>
    </div>
  );
});
ContainerNode.displayName = 'ContainerNode';
