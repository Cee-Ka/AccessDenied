import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { Cloud, Network, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../../store/useGameStore';

export const ContainerNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);

  const getBorderColor = () => {
    if (selected) return 'border-brand-orange ring-2 ring-brand-orange/40 shadow-lg shadow-orange-500/10';
    if (data.type === 'aws_account') return 'border-zinc-300 dark:border-zinc-700/80 bg-zinc-100/40 dark:bg-zinc-950/40';
    if (data.type === 'vpc') return 'border-brand-orange/40 bg-orange-500/5';
    if (data.config?.inPrivateSubnet) return 'border-zinc-300 dark:border-zinc-800 bg-zinc-200/30 dark:bg-black/50';
    return 'border-zinc-300 dark:border-zinc-700/60 bg-zinc-100/30 dark:bg-black/30';
  };

  const getIcon = () => {
    if (data.type === 'aws_account') return <Cloud className="w-4 h-4 text-obsidian-text" />;
    if (data.type === 'vpc') return <Network className="w-4 h-4 text-brand-orange" />;
    return <ShieldAlert className="w-4 h-4 text-obsidian-muted" />;
  };

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[340px] min-h-[220px] rounded-2xl border-2 border-dashed p-4 shadow-sm transition-all cursor-pointer ${getBorderColor()}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-obsidian-border">
        <div className="flex items-center gap-2">
          {getIcon()}
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
