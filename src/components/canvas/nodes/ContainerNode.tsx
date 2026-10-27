import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { Cloud, Network, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../../store/useGameStore';

export const ContainerNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);

  const getBorderColor = () => {
    if (selected) return 'border-amber-400 ring-2 ring-amber-400/30';
    if (data.type === 'aws_account') return 'border-indigo-600/60 bg-indigo-950/10';
    if (data.type === 'vpc') return 'border-emerald-600/60 bg-emerald-950/10';
    if (data.config?.inPrivateSubnet) return 'border-rose-600/50 bg-rose-950/10';
    return 'border-blue-600/50 bg-blue-950/10';
  };

  const getIcon = () => {
    if (data.type === 'aws_account') return <Cloud className="w-4 h-4 text-indigo-400" />;
    if (data.type === 'vpc') return <Network className="w-4 h-4 text-emerald-400" />;
    return <ShieldAlert className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[340px] min-h-[220px] rounded-2xl border-2 border-dashed p-4 shadow-sm transition-all cursor-pointer ${getBorderColor()}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{data.arn}</span>
      </div>
    </div>
  );
});
ContainerNode.displayName = 'ContainerNode';
