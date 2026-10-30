import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NodeType } from '../../types/engine';
import { AwsIcon } from '@access-denied/aws-icons';
import { InfoPopover } from '../common/InfoPopover';
import {
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
  unlockedAtRound: number;
}

const PALETTE: ComponentItem[] = [
  { type: 's3', label: 'S3 Bucket', cost: 5, unlockedAtRound: 1 },
  { type: 'iam_role', label: 'IAM Role', cost: 0, unlockedAtRound: 1 },
  { type: 'ec2', label: 'EC2 Instance', cost: 15, unlockedAtRound: 2 },
  { type: 'lambda', label: 'AWS Lambda', cost: 5, unlockedAtRound: 4 },
  { type: 'dynamodb', label: 'DynamoDB Table', cost: 10, unlockedAtRound: 5 },
  { type: 'kms', label: 'KMS Key', cost: 1, unlockedAtRound: 6 },
  { type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0, unlockedAtRound: 7 },
  { type: 'nat_gw', label: 'NAT Gateway', cost: 32, unlockedAtRound: 7 },
];

export function ComponentDock() {
  const [collapsed, setCollapsed] = useState(false);
  const { addServiceToBoard, currentLevel, gameMode } = useGameStore();

  const isServiceUnlocked = (item: ComponentItem) => {
    if (gameMode === 'Sandbox') return true;
    if (currentLevel.unlockedServices) {
      return currentLevel.unlockedServices.includes(item.type);
    }
    return (currentLevel.roundNumber || 1) >= item.unlockedAtRound;
  };

  const isNewlyUnlocked = (item: ComponentItem) => {
    return currentLevel.newlyUnlockedService?.type === item.type;
  };

  const handleAddService = (item: ComponentItem) => {
    addServiceToBoard(item);
  };

  const handleDragStart = (e: React.DragEvent, item: ComponentItem) => {
    e.dataTransfer.setData('application/accessdenied-node', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`absolute left-0 top-14 bottom-0 bg-obsidian-900/95 backdrop-blur-xl border-r border-obsidian-border transition-all duration-300 z-20 flex flex-col shadow-2xl ${
        collapsed ? 'w-12' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-obsidian-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-obsidian-text">
              Service Palette
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850 mx-auto transition-colors"
          title={collapsed ? 'Expand Dock' : 'Collapse Dock'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {PALETTE.map(item => {
          const unlocked = isServiceUnlocked(item);
          const isNew = isNewlyUnlocked(item);

          return (
            <div key={item.label} className="relative group/item">
            <button
              disabled={!unlocked}
              draggable={unlocked}
              onDragStart={e => handleDragStart(e, item)}
              onClick={() => {
                if (unlocked) {
                  handleAddService(item);
                }
              }}
              className={`w-full group relative flex items-center rounded-xl border transition-all p-2 text-left ${
                collapsed ? 'justify-center' : 'justify-between'
              } ${
                unlocked
                  ? isNew
                    ? 'border-brand-orange/60 bg-orange-500/10 hover:bg-orange-500/20 shadow-sm shadow-orange-500/10 cursor-grab active:cursor-grabbing'
                    : 'border-obsidian-border bg-obsidian-900 hover:bg-obsidian-850 hover:border-obsidian-muted cursor-grab active:cursor-grabbing'
                  : 'border-obsidian-border/40 bg-obsidian-850/50 opacity-40 cursor-not-allowed'
              }`}
              title={
                unlocked
                  ? `Click or Drag to add ${item.label} ($${item.cost}/mo)`
                  : `Locked: Unlocks in Round ${item.unlockedAtRound}`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg bg-white border flex items-center justify-center shrink-0 transition-transform ${
                    unlocked
                      ? 'border-obsidian-border group-hover:scale-105'
                      : 'border-obsidian-border'
                  }`}
                >
                  {unlocked ? (
                    <AwsIcon type={item.type} size={18} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-obsidian-muted" />
                  )}
                </div>

                {!collapsed && (
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold truncate ${
                          unlocked ? 'text-obsidian-text' : 'text-obsidian-muted'
                        }`}
                      >
                        {item.label}
                      </span>
                      {isNew && (
                        <span className="text-[9px] font-mono px-1 rounded bg-brand-orange text-black font-extrabold flex items-center gap-0.5 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-obsidian-muted font-mono">
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
                <div className="pr-5">
                  {unlocked ? (
                    <Plus className="w-3.5 h-3.5 text-obsidian-muted group-hover:text-brand-orange transition-colors shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-obsidian-muted shrink-0" />
                  )}
                </div>
              )}
            </button>
            {!collapsed && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <InfoPopover conceptId={item.type} />
              </span>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
