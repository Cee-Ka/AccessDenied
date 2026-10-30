import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGameStore } from '../../store/useGameStore';
import { CloudNodeData } from '../../types/engine';
import { PrincipalNode } from './nodes/PrincipalNode';
import { ResourceNode } from './nodes/ResourceNode';
import { ContainerNode } from './nodes/ContainerNode';
import { AnimatedPacketEdge } from './edges/AnimatedPacketEdge';
import { ErrorBoundary } from '../common/ErrorBoundary';

function FlowCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addServiceToBoard,
    onNodeDragStart,
    onNodeDragStop,
  } = useGameStore();

  const { screenToFlowPosition } = useReactFlow();

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

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/accessdenied-node');
      if (!rawData) return;
      try {
        const item = JSON.parse(rawData);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addServiceToBoard(item, position);
      } catch (err) {
        console.error('Failed to parse dropped service:', err);
      }
    },
    [addServiceToBoard, screenToFlowPosition]
  );

  return (
    <div
      className="w-full h-full relative bg-obsidian-950"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow<Node<CloudNodeData>>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => selectNode(null)}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        connectionLineStyle={{ stroke: '#ff9900', strokeWidth: 2 }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable={true}
        edgesReconnectable={true}
        className="touch-none"
        aria-label="Architecture canvas. Arrows point from the caller to the part it calls."
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--color-grid)"
        />
        <Controls
          className="bg-obsidian-900 border border-obsidian-border text-obsidian-text rounded-lg overflow-hidden fill-current shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowCanvasInner />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
