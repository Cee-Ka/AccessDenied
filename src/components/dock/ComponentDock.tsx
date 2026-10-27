import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NodeType } from '../../types/engine';
import {
  Server,
  Archive,
  Database,
  Key,
  Shield,
  Cpu,
  Network,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface ComponentItem {
  type: NodeType;
  label: string;
  cost: number;
  icon: typeof Server;
  color: string;
}

const PALETTE: ComponentItem[] = [
  { type: 's3', label: 'S3 Bucket', cost: 5, icon: Archive, color: 'text-emerald-400' },
  { type: 'iam_role', label: 'IAM Role', cost: 0, icon: Shield, color: 'text-emerald-400' },
  { type: 'ec2', label: 'EC2 Instance', cost: 15, icon: Server, color: 'text-orange-400' },
  { type: 'lambda', label: 'AWS Lambda', cost: 5, icon: Cpu, color: 'text-purple-400' },
  { type: 'dynamodb', label: 'DynamoDB Table', cost: 10, icon: Database, color: 'text-blue-400' },
  { type: 'kms', label: 'KMS Key', cost: 1, icon: Key, color: 'text-amber-400' },
  { type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0, icon: Network, color: 'text-cyan-400' },
  { type: 'nat_gw', label: 'NAT Gateway', cost: 32, icon: Network, color: 'text-rose-400' },
];

export function ComponentDock() {
  const [collapsed, setCollapsed] = useState(false);
  const addNodeToBoard = useGameStore(s => s.addNodeToBoard);

  return (
    <div
      className={`absolute left-0 top-14 bottom-0 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 z-20 flex flex-col shadow-2xl ${
        collapsed ? 'w-12' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            AWS Services
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 mx-auto transition-colors"
          title={collapsed ? 'Expand Dock' : 'Collapse Dock'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {PALETTE.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => addNodeToBoard(item.type, item.label, item.cost)}
              className={`w-full group flex items-center rounded-xl border border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700 transition-all p-2 text-left ${
                collapsed ? 'justify-center' : 'justify-between'
              }`}
              title={`Add ${item.label} ($${item.cost}/mo)`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                {!collapsed && (
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-200 truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.cost === 0 ? 'Free' : `$${item.cost}/mo`}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && (
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
