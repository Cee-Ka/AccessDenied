import { AwsIcon } from '@access-denied/aws-icons';
import { Lock } from 'lucide-react';
import { CloudNodeData } from '../../../types/engine';
import { ESSENTIAL_NODE_LABEL } from '../../../store/essential';

/** AWS service icon on a light tile so it keeps contrast in every theme. */
export function ServiceIconTile({ data, size = 32 }: { data: CloudNodeData; size?: number }) {
  return (
    <div
      className="rounded-lg bg-white border border-obsidian-border flex items-center justify-center shrink-0 p-1 shadow-sm"
      style={{ width: size, height: size }}
    >
      <AwsIcon type={data.type} privateSubnet={data.config?.inPrivateSubnet} size={size - 8} />
    </div>
  );
}

export function EssentialLockBadge({ data }: { data: CloudNodeData }) {
  if (!data.essential) return null;
  return (
    <span
      role="img"
      aria-label={ESSENTIAL_NODE_LABEL}
      title={ESSENTIAL_NODE_LABEL}
      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-obsidian-900 border border-obsidian-border text-obsidian-muted flex items-center justify-center shadow-md"
    >
      <Lock className="w-2.5 h-2.5" />
    </span>
  );
}
