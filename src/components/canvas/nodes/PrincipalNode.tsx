import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CloudNodeData } from '../../../types/engine';
import { User, Server, Cpu, Shield, Users } from 'lucide-react';
import { useGameStore } from '../../../store/useGameStore';

export const PrincipalNode = memo(({ id, data, selected }: NodeProps & { data: CloudNodeData }) => {
  const selectNode = useGameStore(s => s.selectNode);

  const getIcon = () => {
    switch (data.type) {
      case 'iam_user':
        return <User className="w-4 h-4 text-amber-400" />;
      case 'iam_role':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'ec2':
        return <Server className="w-4 h-4 text-orange-400" />;
      case 'lambda':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'cognito':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'external_vendor':
        return <Users className="w-4 h-4 text-rose-400" />;
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[190px] rounded-xl border bg-slate-900/95 backdrop-blur-md px-3.5 py-3 shadow-xl transition-all cursor-pointer ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/10'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Ingress Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-amber-500 border-2 border-slate-900 hover:scale-125 transition-transform"
      />

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-100 truncate">{data.label}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {data.monthlyCost > 0 ? `$${data.monthlyCost}/mo` : 'Free'}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
          {data.type.replace('_', ' ')}
        </span>

        {data.config?.imdsVersion && (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              data.config.imdsVersion === 'v2'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse'
            }`}
          >
            IMDS{data.config.imdsVersion.toUpperCase()}
          </span>
        )}

        {data.permissionBoundary && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
            Boundary
          </span>
        )}

        {data.identityPolicies?.length > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {data.identityPolicies.length} {data.identityPolicies.length === 1 ? 'policy' : 'policies'}
          </span>
        )}
      </div>

      {/* Egress Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 hover:scale-125 transition-transform"
      />
    </div>
  );
});
PrincipalNode.displayName = 'PrincipalNode';
