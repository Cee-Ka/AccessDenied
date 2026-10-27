import { create } from 'zustand';
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
} from '@xyflow/react';
import {
  CloudNodeData,
  GameLevel,
  NodeType,
  PolicyDocument,
  SimulationResult,
} from '../types/engine';
import { ALL_LEVELS, SANDBOX_DEFAULT_LEVEL } from '../levels';
import { evaluateExploitChain } from '../engine/exploitChains';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

export type GameMode = 'Learn' | 'Incidents' | 'Sandbox';

interface GameState {
  // Navigation & Mode
  gameMode: GameMode;
  currentLevelId: string;
  currentLevel: GameLevel;
  starRecords: Record<string, number>; // levelId -> stars (1..3)
  isSoundMuted: boolean;

  // React Flow Graph
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Simulation Runner
  simStatus: 'idle' | 'running' | 'paused' | 'completed';
  simSpeed: number; // 1 or 2
  activePacketIndex: number;
  results: SimulationResult[];

  // Modals & Coach
  isCoachModalOpen: boolean;
  inspectedResult: SimulationResult | null;
  isVictoryModalOpen: boolean;
  earnedStars: number;

  // Actions
  setGameMode: (mode: GameMode) => void;
  loadLevel: (levelId: string) => void;
  resetCurrentLevel: () => void;
  selectNode: (id: string | null) => void;
  updateNodeConfig: (nodeId: string, configUpdates: Partial<CloudNodeData['config']>) => void;
  updateNodePolicy: (
    nodeId: string,
    policyType: 'identity' | 'resource' | 'trust' | 'boundary',
    policyIndex: number,
    policyDoc: PolicyDocument
  ) => void;
  addNodeToBoard: (type: NodeType, label: string, cost: number, position?: { x: number; y: number }) => void;
  removeNodeFromBoard: (id: string) => void;

  onNodesChange: (changes: NodeChange<Node<CloudNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  runSimulation: () => Promise<void>;
  resetSimulation: () => void;
  setSimSpeed: (speed: number) => void;
  toggleSound: () => void;
  openCoachModal: (result?: SimulationResult) => void;
  closeCoachModal: () => void;
  closeVictoryModal: () => void;
  resetCampaignProgress: () => void;
}

const STORAGE_KEY = 'access_denied_stars_v1';

export function isLevelUnlocked(levelId: string, starRecords: Record<string, number>): boolean {
  if (levelId === 'sandbox-default') return true;

  const targetLevel = ALL_LEVELS.find(l => l.id === levelId);
  if (!targetLevel) return true;

  if (targetLevel.category === 'Sandbox') return true;

  const trackLevels = ALL_LEVELS.filter(l => l.category === targetLevel.category);
  const index = trackLevels.findIndex(l => l.id === levelId);

  // The first level in any track is always unlocked
  if (index <= 0) return true;

  // The immediately preceding level must have earned at least 1 star
  const prevLevel = trackLevels[index - 1];
  return (starRecords[prevLevel.id] || 0) >= 1;
}

function getInitialStars(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStars(stars: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
  } catch {
    // Ignore storage errors
  }
}

export const useGameStore = create<GameState>((set, get) => {
  const initialLevel = ALL_LEVELS[0];

  const mapLevelToFlow = (lvl: GameLevel) => {
    const nodes: Node<CloudNodeData>[] = lvl.initialNodes.map(n => ({
      id: n.id,
      type: n.type === 'vpc' || n.type === 'subnet' || n.type === 'aws_account' ? 'containerNode' : n.type === 's3' || n.type === 'dynamodb' || n.type === 'kms' || n.type === 'rds' || n.type === 'secrets_manager' ? 'resourceNode' : 'principalNode',
      position: n.position,
      data: { ...n.data },
      parentId: n.parentId,
      extent: n.extent,
    }));

    const edges: Edge[] = lvl.initialEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'packetEdge',
      label: e.label,
      animated: false,
    }));

    return { nodes, edges };
  };

  const initialFlow = mapLevelToFlow(initialLevel);

  return {
    gameMode: 'Learn',
    currentLevelId: initialLevel.id,
    currentLevel: initialLevel,
    starRecords: getInitialStars(),
    isSoundMuted: false,

    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    selectedNodeId: null,

    simStatus: 'idle',
    simSpeed: 1,
    activePacketIndex: -1,
    results: [],

    isCoachModalOpen: false,
    inspectedResult: null,
    isVictoryModalOpen: false,
    earnedStars: 0,

    setGameMode: (mode: GameMode) => {
      if (mode === 'Sandbox') {
        const flow = mapLevelToFlow(SANDBOX_DEFAULT_LEVEL);
        set({
          gameMode: mode,
          currentLevelId: SANDBOX_DEFAULT_LEVEL.id,
          currentLevel: SANDBOX_DEFAULT_LEVEL,
          nodes: flow.nodes,
          edges: flow.edges,
          selectedNodeId: null,
          simStatus: 'idle',
          results: [],
          activePacketIndex: -1,
        });
      } else {
        const targetList = ALL_LEVELS.filter(l => l.category === mode);
        // Default to the first level in that track
        const lvl = targetList[0] || ALL_LEVELS[0];
        const flow = mapLevelToFlow(lvl);
        set({
          gameMode: mode,
          currentLevelId: lvl.id,
          currentLevel: lvl,
          nodes: flow.nodes,
          edges: flow.edges,
          selectedNodeId: null,
          simStatus: 'idle',
          results: [],
          activePacketIndex: -1,
        });
      }
    },

    loadLevel: (levelId: string) => {
      const state = get();
      if (!isLevelUnlocked(levelId, state.starRecords)) {
        sounds.playPacketBlocked();
        return;
      }

      const lvl = ALL_LEVELS.find(l => l.id === levelId) || (levelId === 'sandbox-default' ? SANDBOX_DEFAULT_LEVEL : ALL_LEVELS[0]);
      const flow = mapLevelToFlow(lvl);
      set({
        currentLevelId: lvl.id,
        currentLevel: lvl,
        gameMode: lvl.category,
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: null,
        simStatus: 'idle',
        results: [],
        activePacketIndex: -1,
        isCoachModalOpen: false,
        isVictoryModalOpen: false,
      });
      sounds.playClick();
    },

    resetCampaignProgress: () => {
      saveStars({});
      const firstLevel = ALL_LEVELS[0];
      const flow = mapLevelToFlow(firstLevel);
      set({
        starRecords: {},
        currentLevelId: firstLevel.id,
        currentLevel: firstLevel,
        gameMode: 'Learn',
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: null,
        simStatus: 'idle',
        results: [],
        activePacketIndex: -1,
        isCoachModalOpen: false,
        isVictoryModalOpen: false,
      });
      sounds.playClick();
    },

    resetCurrentLevel: () => {
      const lvl = get().currentLevel;
      const flow = mapLevelToFlow(lvl);
      set({
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: null,
        simStatus: 'idle',
        results: [],
        activePacketIndex: -1,
        isCoachModalOpen: false,
        isVictoryModalOpen: false,
      });
      sounds.playClick();
    },

    selectNode: (id: string | null) => {
      set({ selectedNodeId: id });
      if (id) sounds.playClick();
    },

    updateNodeConfig: (nodeId: string, configUpdates: Partial<CloudNodeData['config']>) => {
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...n.data.config,
                  ...configUpdates,
                },
              },
            };
          }
          return n;
        }),
      }));
    },

    updateNodePolicy: (
      nodeId: string,
      policyType: 'identity' | 'resource' | 'trust' | 'boundary',
      policyIndex: number,
      policyDoc: PolicyDocument
    ) => {
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id !== nodeId) return n;
          const data = { ...n.data };
          if (policyType === 'identity') {
            const list = [...(data.identityPolicies || [])];
            list[policyIndex] = policyDoc;
            data.identityPolicies = list;
          } else if (policyType === 'resource') {
            data.resourcePolicy = policyDoc;
          } else if (policyType === 'trust') {
            data.trustPolicy = policyDoc;
          } else if (policyType === 'boundary') {
            data.permissionBoundary = policyDoc;
          }
          return { ...n, data };
        }),
      }));
    },

    addNodeToBoard: (type: NodeType, label: string, cost: number, position = { x: 250, y: 250 }) => {
      const id = `${type}-${Date.now().toString(36)}`;
      const newNode: Node<CloudNodeData> = {
        id,
        type: type === 'vpc' || type === 'subnet' || type === 'aws_account' ? 'containerNode' : ['s3', 'dynamodb', 'kms', 'rds', 'secrets_manager'].includes(type) ? 'resourceNode' : 'principalNode',
        position,
        data: {
          id,
          type,
          label,
          arn: `arn:aws:${type === 's3' ? 's3:::' : type === 'iam_role' ? 'iam::111122223333:role/' : 'iam::111122223333:user/'}${label.toLowerCase().replace(/\s+/g, '-')}`,
          accountId: '111122223333',
          monthlyCost: cost,
          config: {},
          identityPolicies: [],
        },
      };

      set(state => ({
        nodes: [...state.nodes, newNode],
        selectedNodeId: id,
      }));
      sounds.playClick();
    },

    removeNodeFromBoard: (id: string) => {
      set(state => ({
        nodes: state.nodes.filter(n => n.id !== id),
        edges: state.edges.filter(e => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }));
      sounds.playClick();
    },

    onNodesChange: (changes: NodeChange<Node<CloudNodeData>>[]) => {
      set(state => ({
        nodes: applyNodeChanges(changes, state.nodes) as Node<CloudNodeData>[],
      }));
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      set(state => ({
        edges: applyEdgeChanges(changes, state.edges),
      }));
    },

    onConnect: (connection: Connection) => {
      set(state => ({
        edges: addEdge({ ...connection, type: 'packetEdge' }, state.edges),
      }));
      sounds.playClick();
    },

    runSimulation: async () => {
      const state = get();
      if (state.simStatus === 'running') return;

      const packets = state.currentLevel.packets;
      const allNodeData = state.nodes.map(n => n.data);
      const speed = state.simSpeed;
      const delayMs = speed === 2 ? 350 : 700;

      set({ simStatus: 'running', results: [], activePacketIndex: -1 });

      const newResults: SimulationResult[] = [];

      for (let i = 0; i < packets.length; i++) {
        const pkt = packets[i];
        set({ activePacketIndex: i });

        // Highlight active edge
        set(curr => ({
          edges: curr.edges.map(e => ({
            ...e,
            data: {
              ...e.data,
              isSimulating: (e.source === pkt.sourceNodeId && e.target === pkt.targetNodeId) || (e.target === pkt.sourceNodeId && e.source === pkt.targetNodeId),
              isExploit: pkt.kind === 'exploit',
              speed: speed === 2 ? 0.35 : 0.7,
            },
          })),
        }));

        await new Promise(r => setTimeout(r, delayMs));

        // Evaluate packet
        const res = evaluateExploitChain(pkt, allNodeData);
        const primaryResult = res.hopResults[res.hopResults.length - 1] || {
          packetId: pkt.id,
          success: !res.breached,
          outcome: res.breached ? 'BREACHED' : 'DENY',
          traces: [],
        };

        const finalPass = pkt.kind === 'legitimate' ? primaryResult.outcome === 'ALLOW' : !res.breached && primaryResult.outcome === 'DENY';
        primaryResult.success = finalPass;

        newResults.push(primaryResult);
        set({ results: [...newResults] });

        if (finalPass) {
          sounds.playPacketPass();
        } else {
          sounds.playPacketBlocked();
        }
      }

      // Clear edge animation
      set(curr => ({
        edges: curr.edges.map(e => ({
          ...e,
          data: { ...e.data, isSimulating: false },
        })),
        activePacketIndex: -1,
        simStatus: 'completed',
      }));

      // Evaluate 3-Star Rating
      const legitPackets = packets.filter(p => p.kind === 'legitimate');
      const exploitPackets = packets.filter(p => p.kind === 'exploit');

      const legitPassed = newResults.filter((r, idx) => packets[idx]?.kind === 'legitimate' && r.success).length;
      const exploitBlocked = newResults.filter((r, idx) => packets[idx]?.kind === 'exploit' && r.success).length;

      const star1 = legitPackets.length === 0 || legitPassed === legitPackets.length;
      const star2 = star1 && (exploitPackets.length === 0 || exploitBlocked === exploitPackets.length);

      const totalCost = allNodeData.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);
      const isUnderBudget = totalCost <= state.currentLevel.targetBudget;
      const star3 = star2 && isUnderBudget;

      let earned = 0;
      if (star3) earned = 3;
      else if (star2) earned = 2;
      else if (star1) earned = 1;

      if (earned > 0) {
        const updatedStars = { ...state.starRecords, [state.currentLevel.id]: Math.max(state.starRecords[state.currentLevel.id] || 0, earned) };
        saveStars(updatedStars);
        set({ starRecords: updatedStars, earnedStars: earned, isVictoryModalOpen: true });
        sounds.playVictory();
        confetti({ particleCount: earned * 50, spread: 70, origin: { y: 0.6 } });
      } else {
        // Find first failing result and automatically open coach
        const firstFail = newResults.find(r => !r.success);
        if (firstFail) {
          set({ inspectedResult: firstFail, isCoachModalOpen: true });
        }
      }
    },

    resetSimulation: () => {
      set(curr => ({
        simStatus: 'idle',
        activePacketIndex: -1,
        results: [],
        edges: curr.edges.map(e => ({ ...e, data: { ...e.data, isSimulating: false } })),
      }));
    },

    setSimSpeed: (speed: number) => {
      set({ simSpeed: speed });
    },

    toggleSound: () => {
      const next = !get().isSoundMuted;
      sounds.setMuted(next);
      set({ isSoundMuted: next });
    },

    openCoachModal: (result?: SimulationResult) => {
      const fallback = result || get().results.find(r => !r.success) || get().results[0] || null;
      set({ isCoachModalOpen: true, inspectedResult: fallback });
      sounds.playClick();
    },

    closeCoachModal: () => {
      set({ isCoachModalOpen: false });
      sounds.playClick();
    },

    closeVictoryModal: () => {
      set({ isVictoryModalOpen: false });
      sounds.playClick();
    },
  };
});
