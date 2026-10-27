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
  Lock,
  Sparkles,
} from 'lucide-react';

interface ComponentItem {
  type: NodeType;
  label: string;
  cost: number;
  icon: typeof Server;
  color: string;
  unlockedAtRound: number;
}

const PALETTE: ComponentItem[] = [
  { type: 's3', label: 'S3 Bucket', cost: 5, icon: Archive, color: 'text-emerald-400', unlockedAtRound: 1 },
  { type: 'iam_role', label: 'IAM Role', cost: 0, icon: Shield, color: 'text-emerald-400', unlockedAtRound: 1 },
  { type: 'ec2', label: 'EC2 Instance', cost: 15, icon: Server, color: 'text-orange-400', unlockedAtRound: 2 },
  { type: 'lambda', label: 'AWS Lambda', cost: 5, icon: Cpu, color: 'text-purple-400', unlockedAtRound: 4 },
  { type: 'dynamodb', label: 'DynamoDB Table', cost: 10, icon: Database, color: 'text-blue-400', unlockedAtRound: 5 },
  { type: 'kms', label: 'KMS Key', cost: 1, icon: Key, color: 'text-amber-400', unlockedAtRound: 6 },
  { type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0, icon: Network, color: 'text-cyan-400', unlockedAtRound: 7 },
  { type: 'nat_gw', label: 'NAT Gateway', cost: 32, icon: Network, color: 'text-rose-400', unlockedAtRound: 7 },
];

export function ComponentDock() {
  const [collapsed, setCollapsed] = useState(false);
  const { addNodeToBoard, currentLevel, gameMode } = useGameStore();

  const isServiceUnlocked = (item: ComponentItem) => {
    if (gameMode === 'Sandbox') return true;
    if (currentLevel.unlockedServices) {
      return currentLevel.unlockedServices.includes(item.type);
    }
    // Fallback: unlocked if current round >= item.unlockedAtRound
    return (currentLevel.roundNumber || 1) >= item.unlockedAtRound;
  };

  const isNewlyUnlocked = (item: ComponentItem) => {
    return currentLevel.newlyUnlockedService?.type === item.type;
  };

  return (
    <div
      className={`absolute left-0 top-14 bottom-0 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 z-20 flex flex-col shadow-2xl ${
        collapsed ? 'w-12' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              AWS Palette
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              (Round {currentLevel.roundNumber || 0})
            </span>
          </div>
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
          const unlocked = isServiceUnlocked(item);
          const isNew = isNewlyUnlocked(item);

          return (
            <button
              key={item.label}
              disabled={!unlocked}
              onClick={() => {
                if (unlocked) {
                  addNodeToBoard(item.type, item.label, item.cost);
                }
              }}
              className={`w-full group relative flex items-center rounded-xl border transition-all p-2 text-left ${
                collapsed ? 'justify-center' : 'justify-between'
              } ${
                unlocked
                  ? isNew
                    ? 'border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10'
                    : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700'
                  : 'border-slate-900 bg-slate-950/30 opacity-40 cursor-not-allowed'
              }`}
              title={
                unlocked
                  ? `Add ${item.label} ($${item.cost}/mo)`
                  : `Locked: Unlocks in Round ${item.unlockedAtRound}`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg bg-slate-900 border flex items-center justify-center shrink-0 transition-transform ${
                    unlocked
                      ? 'border-slate-800 group-hover:scale-105'
                      : 'border-slate-900'
                  }`}
                >
                  {unlocked ? (
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>

                {!collapsed && (
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium truncate ${
                          unlocked ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {item.label}
                      </span>
                      {isNew && (
                        <span className="text-[9px] font-mono px-1 rounded bg-amber-400 text-slate-950 font-bold flex items-center gap-0.5 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {unlocked
                        ? item.cost === 0
                          ? 'Free'
                          : `$${item.cost}/mo`
                        : `Unlocks R${item.unlockedAtRound}`}
                    </div>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div>
                  {unlocked ? (
                    <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
