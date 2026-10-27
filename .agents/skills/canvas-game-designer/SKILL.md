---
name: canvas-game-designer
description: >-
  Use this skill when developing, refactoring, or optimizing React Flow (@xyflow/react v12) canvas features,
  custom node components, animated SVG packet edges, container nesting (VPC/Subnet groups),
  or interactive state management for the AccessDenied game.
---

# Canvas Game Designer Skill (@xyflow/react & Game State)

This skill provides architecture guidelines and code patterns for implementing the interactive whiteboard canvas in **AccessDenied**.

## 1. Node Architecture Pattern

Nodes in AccessDenied represent AWS compute, identity, storage, or network boundaries:
- **Principal Nodes**: IAM User, IAM Role, EC2, Lambda, Cognito
- **Resource Nodes**: S3 Bucket, DynamoDB Table, RDS Database, KMS Key, Secrets Manager
- **Container Nodes**: AWS Account, VPC, Public Subnet, Private Subnet

### Custom Node Template
```tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CloudNodeData } from '@/types/engine';

export const PrincipalNode = memo(({ data, selected }: NodeProps<CloudNodeData>) => {
  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-slate-900 shadow-lg transition-all ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      {/* Target connection handle (Inbound requests) */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          {/* AWS Icon */}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">{data.label}</div>
          <div className="text-[10px] text-slate-400 font-mono">${data.monthlyCost}/mo</div>
        </div>
      </div>

      {/* Security posture badges */}
      {data.config.imdsVersion && (
        <span className={`mt-2 inline-block text-[9px] px-1.5 py-0.5 rounded font-mono ${
          data.config.imdsVersion === 'v2' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
        }`}>
          IMDS{data.config.imdsVersion.toUpperCase()}
        </span>
      )}

      {/* Source connection handle (Outbound API calls) */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
    </div>
  );
});
```

## 2. Animated SVG Packet Edges

During simulation, packets flow across edges:
- **Green Pulses**: Legitimate business workloads.
- **Red Pulses**: Adversary exploit payloads.
- **Status Pills**: Appear at the destination (`200 OK`, `403 AccessDenied`, `BREACHED`).

```tsx
import { BaseEdge, getBezierPath, EdgeProps } from '@xyflow/react';

export function AnimatedPacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#334155', strokeWidth: 2 }} />
      {data?.isSimulating && (
        <circle r="4" fill={data.isExploit ? '#ef4444' : '#10b981'}>
          <animateMotion dur={`${data.speed || 1}s`} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}
```

## 3. Container Nesting (Subflows)

In `@xyflow/react`, containers like VPCs and Subnets use `parentId` and `extent: 'parent'`:
- Child nodes (EC2, Lambda) set `parentId: subnetId`.
- Position of child nodes becomes relative to the top-left of the container.
- Moving the container automatically moves all enclosed child nodes.
