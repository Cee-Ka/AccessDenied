import { AwsIcon } from '@access-denied/aws-icons';
import { Lock } from 'lucide-react';
import { CloudNodeData } from '../../../types/engine';
import { ESSENTIAL_NODE_LABEL } from '../../../store/essential';

/** AWS service icon on a light tile so it keeps contrast in every theme. */
export function ServiceIconTile({ data, size = 32 }: { data: CloudNodeData; size?: number }) {
  return (
    <div
      className="rounded-sm bg-white border-2 border-neo-ink flex items-center justify-center shrink-0 p-1"
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
      className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-sm bg-neo-yellow neo-on-accent border-2 border-neo-ink flex items-center justify-center shadow-neo-sm"
    >
      <Lock className="w-3 h-3" />
    </span>
  );
}
