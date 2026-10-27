import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGameStore } from '../../store/useGameStore';
import { CloudNodeData } from '../../types/engine';
import { PrincipalNode } from './nodes/PrincipalNode';
import { ResourceNode } from './nodes/ResourceNode';
import { ContainerNode } from './nodes/ContainerNode';
import { AnimatedPacketEdge } from './edges/AnimatedPacketEdge';

export function FlowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
  } = useGameStore();

  const nodeTypes = useMemo(
    () => ({
      principalNode: PrincipalNode,
      resourceNode: ResourceNode,
      containerNode: ContainerNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      packetEdge: AnimatedPacketEdge,
    }),
    []
  );

  return (
    <div className="w-full h-full relative bg-slate-950">
      <ReactFlow<Node<CloudNodeData>>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => selectNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#1e293b"
        />
        <Controls
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg overflow-hidden fill-slate-300 shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}
