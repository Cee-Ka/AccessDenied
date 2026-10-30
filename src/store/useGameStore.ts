import { create } from 'zustand';
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import {
  CloudNodeData,
  GameLevel,
  NodeType,
  PolicyDocument,
  SimulationPacket,
  SimulationResult,
} from '../types/engine';
import { ALL_LEVELS, SANDBOX_DEFAULT_LEVEL } from '../levels';
import { evaluateExploitChain } from '../engine/exploitChains';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  OnboardingProgress,
  PlayerProfile,
  SavedBoard,
  StorageStatus,
  ThemeMode,
  createDefaultSave,
  hashString,
  loadSave,
  serializeBoard,
  writeSave,
} from '../persistence/save';
import { buildBoardFile, parseBoardFile } from '../persistence/boardFile';
import { BoardSnapshot, HistoryState, emptyHistory, pushHistory, redoHistory, undoHistory } from './history';
import { essentialNotice, filterDeletableNodeIds } from './essential';

export type GameMode = 'Learn' | 'Incidents' | 'Sandbox';
export type { ThemeMode };

export type ReturnOutcome = 'allow' | 'deny' | 'timeout';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'warn' | 'error';
}

export interface TwistBanner {
  id: number;
  message: string;
  /** First sighting: stays until dismissed. Later runs auto-hide. */
  sticky: boolean;
}

interface GameState {
  // Navigation & Mode
  theme: ThemeMode;
  gameMode: GameMode;
  currentLevelId: string;
  currentLevel: GameLevel;
  starRecords: Record<string, number>; // levelId -> stars (1..3)
  isSoundMuted: boolean;

  // Player & persistence
  profile: PlayerProfile;
  storageStatus: StorageStatus;
  savedBoards: Record<string, SavedBoard>;
  onboarding: OnboardingProgress;

  // React Flow Graph
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  history: HistoryState;

  // Simulation Runner
  simStatus: 'idle' | 'running' | 'paused' | 'completed';
  simSpeed: number; // 1 or 2
  activePacketIndex: number;
  results: SimulationResult[];
  skipRequested: boolean;
  /** True while the last run's results still describe the board (no edits since). */
  resultsCurrent: boolean;
  lastRunStars: number;

  // Modals, Coach & overlays
  isCoachModalOpen: boolean;
  inspectedResult: SimulationResult | null;
  isVictoryModalOpen: boolean;
  earnedStars: number;
  isReportCardOpen: boolean;
  isWelcomeOpen: boolean;
  isSettingsOpen: boolean;
  isGuideOpen: boolean;
  isAskAgentOpen: boolean;
  twistBanner: TwistBanner | null;
  toast: Toast | null;

  // Actions
  setGameMode: (mode: GameMode) => void;
  loadLevel: (levelId: string) => void;
  resetCurrentLevel: () => void;
  selectNode: (id: string | null) => void;
  updateNodeConfig: (nodeId: string, configUpdates: Partial<CloudNodeData['config']>) => void;
  updateNodePolicy: (
    nodeId: string,
    policyType: 'identity' | 'resource' | 'trust' | 'boundary' | 'scp',
    policyIndex: number,
    policyDoc: PolicyDocument
  ) => void;
  addNodeToBoard: (
    type: NodeType,
    label: string,
    cost: number,
    position?: { x: number; y: number },
    customData?: Partial<CloudNodeData>
  ) => void;
  addServiceToBoard: (
    item: { type: NodeType; label: string; cost: number },
    position?: { x: number; y: number }
  ) => void;
  removeNodeFromBoard: (id: string) => void;
  removeEdge: (edgeId: string) => void;
  reverseEdge: (edgeId: string) => void;
  addEdgeToBoard: (edge: Partial<Edge> & { source: string; target: string }) => void;

  onNodesChange: (changes: NodeChange<Node<CloudNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;

  undo: () => void;
  redo: () => void;

  runSimulation: () => Promise<void>;
  resetSimulation: () => void;
  setSimSpeed: (speed: number) => void;
  toggleSound: () => void;
  openCoachModal: (result?: SimulationResult) => void;
  closeCoachModal: () => void;
  closeVictoryModal: () => void;
  openReportCard: () => void;
  closeReportCard: () => void;
  resetCampaignProgress: () => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;

  exportBoard: () => string;
  importBoard: (text: string) => boolean;

  completeWelcome: (opts: { displayName: string; startTutorial: boolean }) => void;
  setDisplayName: (name: string) => void;
  openSettings: () => void;
  closeSettings: () => void;

  openGuide: () => void;
  exitGuide: () => void;
  setGuideStep: (step: number) => void;
  completeGuide: () => void;

  openAskAgent: () => void;
  closeAskAgent: () => void;

  dismissTwist: () => void;
  showToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: () => void;
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function isLevelUnlocked(levelId: string, starRecords: Record<string, number>): boolean {
  if (levelId === 'sandbox-default') return true;

  const targetLevel = ALL_LEVELS.find(l => l.id === levelId);
  if (!targetLevel) return true;

  if (targetLevel.category === 'Sandbox') return true;

  // Round 0 is the optional tutorial: always open, and it never gates Round 1.
  if (targetLevel.roundNumber === 0) return true;

  const trackLevels = ALL_LEVELS.filter(l => l.category === targetLevel.category && l.roundNumber !== 0);
  const index = trackLevels.findIndex(l => l.id === levelId);

  // The first level in any track is always unlocked
  if (index <= 0) return true;

  // The immediately preceding level must have earned at least 1 star
  const prevLevel = trackLevels[index - 1];
  return (starRecords[prevLevel.id] || 0) >= 1;
}

export function findLevel(levelId: string): GameLevel | undefined {
  if (levelId === SANDBOX_DEFAULT_LEVEL.id) return SANDBOX_DEFAULT_LEVEL;
  return ALL_LEVELS.find(l => l.id === levelId);
}

/** Changes whenever a level's starting setup changes, so stale saved boards are detected. */
export function levelRevision(lvl: GameLevel): string {
  return hashString(JSON.stringify([lvl.initialNodes, lvl.initialEdges]));
}

export function flowTypeFor(type: NodeType): string {
  if (type === 'vpc' || type === 'subnet' || type === 'aws_account') return 'containerNode';
  if (['s3', 'dynamodb', 'kms', 'rds', 'secrets_manager'].includes(type)) return 'resourceNode';
  return 'principalNode';
}

export function mapLevelToFlow(lvl: GameLevel): BoardSnapshot {
  const nodes: Node<CloudNodeData>[] = lvl.initialNodes.map(n => {
    const essential = n.essential ?? true;
    return {
      id: n.id,
      type: flowTypeFor(n.type),
      position: n.position,
      data: { ...n.data, essential },
      parentId: n.parentId,
      extent: n.extent,
      deletable: !essential,
    };
  });

  const edges: Edge[] = lvl.initialEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'packetEdge',
    label: e.label,
    data: e.data,
    animated: false,
  }));

  return { nodes, edges };
}

export interface RunScore {
  earned: number;
  totalCost: number;
}

/** Star rating for one run. Star 2 needs star 1; star 3 needs star 2. */
export function scoreRun(
  packets: SimulationPacket[],
  results: SimulationResult[],
  nodes: CloudNodeData[],
  targetBudget: number
): RunScore {
  const legitPackets = packets.filter(p => p.kind === 'legitimate');
  const exploitPackets = packets.filter(p => p.kind === 'exploit');
  const legitPassed = results.filter((r, idx) => packets[idx]?.kind === 'legitimate' && r.success).length;
  const exploitBlocked = results.filter((r, idx) => packets[idx]?.kind === 'exploit' && r.success).length;

  const star1 = legitPackets.length === 0 || legitPassed === legitPackets.length;
  const star2 = star1 && (exploitPackets.length === 0 || exploitBlocked === exploitPackets.length);
  const totalCost = nodes.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);
  const star3 = star2 && totalCost <= targetBudget;

  return { earned: star3 ? 3 : star2 ? 2 : star1 ? 1 : 0, totalCost };
}

/** Evaluate one packet and mark it as passed or failed from the player's point of view. */
export function evaluatePacket(
  pkt: SimulationPacket,
  nodes: CloudNodeData[],
  edges: Array<{ source: string; target: string }>
): SimulationResult {
  const res = evaluateExploitChain(pkt, nodes, edges);
  const primary: SimulationResult = { ...(res.hopResults[res.hopResults.length - 1] || {
    packetId: pkt.id,
    success: !res.breached,
    outcome: res.breached ? 'BREACHED' : 'DENY',
    traces: [],
  }) };
  primary.packetId = pkt.id;
  primary.success = pkt.kind === 'legitimate' ? primary.outcome === 'ALLOW' : !res.breached && primary.outcome === 'DENY';
  if (pkt.kind === 'exploit' && res.breached) primary.outcome = 'BREACHED';
  return primary;
}

function returnOutcomeFor(result: SimulationResult): { outcome: ReturnOutcome; label: string } {
  if (result.outcome === 'NETWORK_UNREACHABLE') return { outcome: 'timeout', label: 'timeout' };
  if (result.outcome === 'ALLOW' || result.outcome === 'BREACHED') return { outcome: 'allow', label: '200' };
  return { outcome: 'deny', label: '403' };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let toastSeq = 0;
let dragSnapshot: BoardSnapshot | null = null;

export const useGameStore = create<GameState>((set, get) => {
  const loaded = loadSave();
  const save = loaded.save;

  const startLevelId =
    save.profile.lastLevelId && findLevel(save.profile.lastLevelId) && isLevelUnlocked(save.profile.lastLevelId, save.progress.stars)
      ? save.profile.lastLevelId
      : 'round-1';
  const startLevel = findLevel(startLevelId) || ALL_LEVELS[0];

  /** Board for a level: the saved board when it matches the current level revision, else the initial board. */
  const boardFor = (lvl: GameLevel, boards: Record<string, SavedBoard>): BoardSnapshot & { stale: boolean } => {
    const saved = boards[lvl.id];
    if (saved && saved.levelRevision === levelRevision(lvl)) {
      return { nodes: saved.nodes, edges: saved.edges, stale: false };
    }
    return { ...mapLevelToFlow(lvl), stale: Boolean(saved) };
  };

  /** Saved boards including the board currently on the canvas. */
  const captureCurrentBoard = (): Record<string, SavedBoard> => {
    const s = get();
    return {
      ...s.savedBoards,
      [s.currentLevelId]: { levelRevision: levelRevision(s.currentLevel), ...serializeBoard(s.nodes, s.edges) },
    };
  };

  const initialFlow = boardFor(startLevel, save.progress.boards);
  applyThemeToDocument(save.settings.theme);
  sounds.setMuted(save.settings.soundMuted);

  const toastFrom = (message: string, tone: Toast['tone'] = 'info'): Toast => ({ id: ++toastSeq, message, tone });

  /** Record the board before an edit so it can be undone. */
  const record = (coalesceKey: string | null = null) => {
    const s = get();
    set({
      history: pushHistory(s.history, { nodes: s.nodes, edges: s.edges }, coalesceKey),
      resultsCurrent: false,
    });
  };

  const insertNode = (
    type: NodeType,
    label: string,
    cost: number,
    position: { x: number; y: number },
    customData?: Partial<CloudNodeData>
  ): string | null => {
    const id = customData?.id || `${type}-${Date.now().toString(36)}`;

    // Guard against duplicate node keys
    if (get().nodes.some(n => n.id === id)) {
      set({ selectedNodeId: id });
      sounds.playClick();
      return null;
    }

    const newNode: Node<CloudNodeData> = {
      id,
      type: flowTypeFor(type),
      position: {
        x: position.x + (get().nodes.length % 4) * 30,
        y: position.y + (get().nodes.length % 4) * 20,
      },
      data: {
        id,
        type,
        label: customData?.label || label,
        arn: customData?.arn || `arn:aws:${type === 's3' ? 's3:::' : type === 'iam_role' ? 'iam::111122223333:role/' : 'iam::111122223333:user/'}${label.toLowerCase().replace(/\s+/g, '-')}`,
        accountId: customData?.accountId || '111122223333',
        monthlyCost: customData?.monthlyCost ?? cost,
        essential: false,
        config: {
          ...(customData?.config || {}),
        },
        identityPolicies: customData?.identityPolicies || [],
        resourcePolicy: customData?.resourcePolicy,
        trustPolicy: customData?.trustPolicy,
        permissionBoundary: customData?.permissionBoundary,
        scpPolicies: customData?.scpPolicies,
      },
    };

    set(state => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }));
    sounds.playClick();
    return id;
  };

  const insertEdge = (edge: Partial<Edge> & { source: string; target: string }) => {
    const id = edge.id || `edge-${edge.source}-${edge.target}`;
    set(state => {
      if (state.edges.some(e => e.id === id || (e.source === edge.source && e.target === edge.target))) {
        return state;
      }
      const newEdge: Edge = {
        id,
        source: edge.source,
        target: edge.target,
        type: 'packetEdge',
        label: edge.label,
        data: edge.data,
        animated: false,
      };
      return { edges: [...state.edges, newEdge] };
    });
  };

  /** Shared state reset when a different board is shown. */
  const boardSwitch = (lvl: GameLevel, flow: BoardSnapshot) => ({
    currentLevelId: lvl.id,
    currentLevel: lvl,
    gameMode: lvl.category,
    nodes: flow.nodes,
    edges: flow.edges,
    selectedNodeId: null,
    history: emptyHistory(),
    simStatus: 'idle' as const,
    results: [],
    resultsCurrent: false,
    activePacketIndex: -1,
    isCoachModalOpen: false,
    isVictoryModalOpen: false,
    isAskAgentOpen: false,
    twistBanner: null,
    isReportCardOpen: lvl.category !== 'Sandbox',
    isGuideOpen: Boolean(lvl.onboardingSteps?.length) && !get().onboarding.completed[lvl.id],
  });

  const openLevel = (lvl: GameLevel) => {
    const savedBoards = captureCurrentBoard();
    const flow = boardFor(lvl, savedBoards);
    set({
      ...boardSwitch(lvl, flow),
      savedBoards,
      profile: { ...get().profile, lastLevelId: lvl.id },
      toast: flow.stale
        ? toastFrom('Your saved board was made for an older version of this level, so it was started over.', 'warn')
        : get().toast,
    });
  };

  return {
    theme: save.settings.theme,
    gameMode: startLevel.category,
    currentLevelId: startLevel.id,
    currentLevel: startLevel,
    starRecords: save.progress.stars,
    isSoundMuted: save.settings.soundMuted,

    profile: save.profile,
    storageStatus: loaded.status,
    savedBoards: save.progress.boards,
    onboarding: save.progress.onboarding,

    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    selectedNodeId: null,
    history: emptyHistory(),

    simStatus: 'idle',
    simSpeed: save.settings.simSpeed,
    activePacketIndex: -1,
    results: [],
    skipRequested: false,
    resultsCurrent: false,
    lastRunStars: 0,

    isCoachModalOpen: false,
    inspectedResult: null,
    isVictoryModalOpen: false,
    earnedStars: 0,
    isReportCardOpen: startLevel.category !== 'Sandbox',
    isWelcomeOpen: !save.profile.firstRunCompleted,
    isSettingsOpen: false,
    isGuideOpen: Boolean(startLevel.onboardingSteps?.length) && !save.progress.onboarding.completed[startLevel.id],
    isAskAgentOpen: false,
    twistBanner: null,
    toast: loaded.notice
      ? toastFrom(loaded.notice, 'warn')
      : initialFlow.stale
      ? toastFrom('Your saved board was made for an older version of this level, so it was started over.', 'warn')
      : null,

    setGameMode: (mode: GameMode) => {
      if (mode === 'Sandbox') {
        openLevel(SANDBOX_DEFAULT_LEVEL);
        return;
      }
      const { profile, starRecords } = get();
      const last = profile.lastLevelId ? findLevel(profile.lastLevelId) : undefined;
      const lvl =
        last && last.category === mode && isLevelUnlocked(last.id, starRecords)
          ? last
          : ALL_LEVELS.find(l => l.category === mode && l.roundNumber !== 0) || ALL_LEVELS[0];
      openLevel(lvl);
    },

    loadLevel: (levelId: string) => {
      const state = get();
      if (!isLevelUnlocked(levelId, state.starRecords)) {
        sounds.playPacketBlocked();
        return;
      }

      const lvl = findLevel(levelId) || ALL_LEVELS[0];
      openLevel(lvl);
      sounds.playClick();
    },

    resetCampaignProgress: () => {
      const firstLevel = findLevel('round-1') || ALL_LEVELS[0];
      const fresh = createDefaultSave();
      set({
        ...boardSwitch(firstLevel, mapLevelToFlow(firstLevel)),
        starRecords: {},
        savedBoards: {},
        onboarding: fresh.progress.onboarding,
        profile: { ...get().profile, firstRunCompleted: false, lastLevelId: null },
        isWelcomeOpen: true,
        isSettingsOpen: false,
        isGuideOpen: false,
      });
      sounds.playClick();
    },

    resetCurrentLevel: () => {
      const lvl = get().currentLevel;
      const { [lvl.id]: _discarded, ...savedBoards } = get().savedBoards;
      set({
        ...boardSwitch(lvl, mapLevelToFlow(lvl)),
        savedBoards,
        isReportCardOpen: false,
      });
      sounds.playClick();
    },

    selectNode: (id: string | null) => {
      set({ selectedNodeId: id });
      if (id) sounds.playClick();
    },

    toggleTheme: () => {
      const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(next);
      set({ theme: next });
      sounds.playClick();
    },

    setTheme: (theme: ThemeMode) => {
      applyThemeToDocument(theme);
      set({ theme });
    },

    updateNodeConfig: (nodeId: string, configUpdates: Partial<CloudNodeData['config']>) => {
      record(`config:${nodeId}:${Object.keys(configUpdates).join(',')}`);
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
      policyType: 'identity' | 'resource' | 'trust' | 'boundary' | 'scp',
      policyIndex: number,
      policyDoc: PolicyDocument
    ) => {
      record(`policy:${nodeId}:${policyType}:${policyIndex}`);
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
          } else if (policyType === 'scp') {
            const list = [...(data.scpPolicies || [])];
            list[policyIndex] = policyDoc;
            data.scpPolicies = list;
          }
          return { ...n, data };
        }),
      }));
    },

    addNodeToBoard: (
      type: NodeType,
      label: string,
      cost: number,
      position = { x: 380, y: 220 },
      customData?: Partial<CloudNodeData>
    ) => {
      if (customData?.id && get().nodes.some(n => n.id === customData.id)) {
        set({ selectedNodeId: customData.id });
        return;
      }
      record();
      insertNode(type, label, cost, position, customData);
    },

    addServiceToBoard: (
      item: { type: NodeType; label: string; cost: number },
      position?: { x: number; y: number }
    ) => {
      const state = get();
      const round = state.currentLevel.roundNumber;
      let customData: Partial<CloudNodeData> | undefined;

      if (round === 1 && item.type === 's3') {
        customData = {
          id: 'invoices-bucket',
          label: 'customer-invoices',
          arn: 'arn:aws:s3:::customer-invoices',
          config: { blockPublicAccess: false },
          resourcePolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicInvoicesRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: 'arn:aws:s3:::customer-invoices/*',
              },
            ],
          },
        };
      } else if (round === 2 && item.type === 'ec2') {
        customData = {
          id: 'preview-ec2',
          label: 'URL Preview EC2',
          arn: 'arn:aws:iam::111122223333:role/PreviewerRole',
          config: { imdsVersion: 'v1', imdsHopLimit: 2 },
          identityPolicies: [
            {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'OverlyBroadS3Access',
                  Effect: 'Allow',
                  Action: ['s3:*'],
                  Resource: '*',
                },
              ],
            },
          ],
        };
      } else if (round === 3 && item.type === 'iam_role') {
        customData = {
          id: 'vendor-role',
          label: 'VendorAnalyticsRole',
          arn: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
          config: { requireExternalId: '' },
          trustPolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowVendorAssumeRole',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::222233334444:root' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          identityPolicies: [
            {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'ReadSalesMetrics',
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:ListBucket'],
                  Resource: ['arn:aws:s3:::sales-metrics', 'arn:aws:s3:::sales-metrics/*'],
                },
              ],
            },
          ],
        };
      } else if (round === 4 && (item.type === 'iam_role' || item.type === 'lambda')) {
        customData = {
          id: 'worker-role',
          label: 'lambda-worker-exec',
          arn: 'arn:aws:iam::111122223333:role/lambda-worker-exec',
          config: {},
          identityPolicies: [
            {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'WorkerLogPolicy',
                  Effect: 'Allow',
                  Action: ['logs:CreateLogGroup', 'logs:PutLogEvents'],
                  Resource: '*',
                },
              ],
            },
          ],
        };
      } else if (round === 5 && item.type === 'dynamodb') {
        customData = {
          id: 'records-dynamodb',
          label: 'CustomerRecords',
          arn: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
        };
      } else if (round === 6 && item.type === 'kms') {
        customData = {
          id: 'payment-cmk',
          label: 'Payments CMK Key',
          arn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments',
          resourcePolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'KeyAdministrationOnly',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::111122223333:user/kms-admin' },
                Action: 'kms:*',
                Resource: '*',
              },
            ],
          },
        };
      } else if (round === 7 && item.type === 'vpc_endpoint') {
        customData = {
          id: 's3-endpoint',
          label: 'VPC S3 Gateway Endpoint',
          config: { service: 's3', endpointType: 'gateway' },
        };
      }

      // Check if singleton node already placed
      if (customData?.id && state.nodes.some(n => n.id === customData.id)) {
        state.selectNode(customData.id);
        return;
      }

      // One undo step covers the node and its auto-wired threat edge.
      record();
      insertNode(item.type, item.label, item.cost, position || { x: 380, y: 220 }, customData);

      // Auto-wire adversary threat vectors
      if (round === 1 && item.type === 's3') {
        insertEdge({
          id: 'edge-botnet-probe',
          source: 'botnet-scraper',
          target: 'invoices-bucket',
          label: 'Public Internet Probe',
          data: { isThreat: true },
        });
      } else if (round === 2 && item.type === 'ec2') {
        insertEdge({
          id: 'edge-ssrf-probe',
          source: 'ssrf-attacker',
          target: 'preview-ec2',
          label: 'SSRF Ingress Probe',
          data: { isThreat: true },
        });
      } else if (round === 3 && item.type === 'iam_role') {
        insertEdge({
          id: 'edge-vendor-saas',
          source: 'vendor-saas',
          target: 'vendor-role',
          label: 'AssumeRole Request',
          data: { isThreat: false },
        });
      }
    },

    removeNodeFromBoard: (id: string) => {
      const { deletable, kept } = filterDeletableNodeIds([id], get().nodes);
      if (kept.length > 0) {
        set({ toast: toastFrom(essentialNotice(kept), 'warn') });
        sounds.playPacketBlocked();
        return;
      }
      if (deletable.length === 0) return;
      record();
      set(state => ({
        nodes: state.nodes.filter(n => n.id !== id),
        edges: state.edges.filter(e => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }));
      sounds.playClick();
    },

    removeEdge: (edgeId: string) => {
      record();
      set(state => ({
        edges: state.edges.filter(e => e.id !== edgeId),
      }));
      sounds.playClick();
    },

    reverseEdge: (edgeId: string) => {
      const edge = get().edges.find(e => e.id === edgeId);
      if (!edge) return;
      if (get().edges.some(e => e.source === edge.target && e.target === edge.source)) {
        set({ toast: toastFrom('A connection in that direction already exists.', 'info') });
        return;
      }
      record();
      set(state => ({
        edges: state.edges.map(e =>
          e.id === edgeId
            ? {
                ...e,
                id: `edge-${edge.target}-${edge.source}`,
                source: edge.target,
                target: edge.source,
                sourceHandle: null,
                targetHandle: null,
              }
            : e
        ),
      }));
      sounds.playClick();
    },

    addEdgeToBoard: edge => {
      record();
      insertEdge(edge);
    },

    onNodesChange: (changes: NodeChange<Node<CloudNodeData>>[]) => {
      const removeIds = changes.filter(c => c.type === 'remove').map(c => c.id);
      let applied = changes;

      if (removeIds.length > 0) {
        const { deletable, kept } = filterDeletableNodeIds(removeIds, get().nodes);
        if (kept.length > 0) {
          set({ toast: toastFrom(essentialNotice(kept), 'warn') });
          const keptIds = new Set(kept.map(n => n.id));
          applied = changes.filter(c => !(c.type === 'remove' && keptIds.has(c.id)));
        }
        if (deletable.length > 0) {
          record('delete');
          const gone = new Set(deletable);
          set(state => ({
            edges: state.edges.filter(e => !gone.has(e.source) && !gone.has(e.target)),
            selectedNodeId: state.selectedNodeId && gone.has(state.selectedNodeId) ? null : state.selectedNodeId,
          }));
        }
      } else if (changes.some(c => c.type === 'add' || c.type === 'replace')) {
        record();
      }

      set(state => ({
        nodes: applyNodeChanges(applied, state.nodes) as Node<CloudNodeData>[],
      }));
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      if (changes.some(c => c.type === 'remove')) record('delete');
      set(state => ({
        edges: applyEdgeChanges(changes, state.edges),
      }));
    },

    onConnect: (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return;
      if (get().edges.some(e => e.source === source && e.target === target)) return;
      record();
      insertEdge({ source, target });
      sounds.playClick();
    },

    onNodeDragStart: () => {
      const s = get();
      dragSnapshot = { nodes: s.nodes, edges: s.edges };
    },

    onNodeDragStop: () => {
      const before = dragSnapshot;
      dragSnapshot = null;
      if (!before) return;
      const s = get();
      const moved = s.nodes.some(n => {
        const prev = before.nodes.find(p => p.id === n.id);
        return prev && (prev.position.x !== n.position.x || prev.position.y !== n.position.y);
      });
      // Moving a node does not change simulation results, so resultsCurrent stays as is.
      if (moved) set({ history: pushHistory(s.history, before) });
    },

    undo: () => {
      const s = get();
      if (s.simStatus === 'running') return;
      const step = undoHistory(s.history, { nodes: s.nodes, edges: s.edges });
      if (!step) return;
      set({
        ...step.board,
        history: step.history,
        resultsCurrent: false,
        selectedNodeId: step.board.nodes.some(n => n.id === s.selectedNodeId) ? s.selectedNodeId : null,
      });
    },

    redo: () => {
      const s = get();
      if (s.simStatus === 'running') return;
      const step = redoHistory(s.history, { nodes: s.nodes, edges: s.edges });
      if (!step) return;
      set({
        ...step.board,
        history: step.history,
        resultsCurrent: false,
        selectedNodeId: step.board.nodes.some(n => n.id === s.selectedNodeId) ? s.selectedNodeId : null,
      });
    },

    runSimulation: async () => {
      const state = get();
      if (state.simStatus === 'running') {
        // Pressing Run during a run skips to the end.
        set({ skipRequested: true });
        return;
      }

      const level = state.currentLevel;
      const packets = level.packets;
      const allNodeData = state.nodes.map(n => n.data);
      const evalEdges = state.edges.map(e => ({ source: e.source, target: e.target }));
      const speed = state.simSpeed;
      const halfDelay = speed === 2 ? 175 : 350;

      let twistBanner: TwistBanner | null = null;
      let onboarding = state.onboarding;
      if (level.twistPager) {
        const firstTime = !onboarding.seenTwists.includes(level.id);
        twistBanner = { id: Date.now(), message: level.twistPager, sticky: firstTime };
        if (firstTime) onboarding = { ...onboarding, seenTwists: [...onboarding.seenTwists, level.id] };
      }

      set({
        simStatus: 'running',
        results: [],
        activePacketIndex: -1,
        skipRequested: false,
        isCoachModalOpen: false,
        isVictoryModalOpen: false,
        isAskAgentOpen: false,
        twistBanner,
        onboarding,
      });

      const newResults: SimulationResult[] = [];
      const isOnPath = (e: Edge, pkt: SimulationPacket) => {
        const direct = state.edges.some(x => x.source === pkt.sourceNodeId && x.target === pkt.targetNodeId);
        return direct ? e.source === pkt.sourceNodeId && e.target === pkt.targetNodeId : e.source === pkt.sourceNodeId;
      };

      for (let i = 0; i < packets.length; i++) {
        const pkt = packets[i];
        const animate = !get().skipRequested;

        if (animate) {
          set(curr => ({
            activePacketIndex: i,
            edges: curr.edges.map(e => ({
              ...e,
              data: {
                ...e.data,
                isSimulating: isOnPath(e, pkt),
                isExploit: pkt.kind === 'exploit',
                speed: speed === 2 ? 0.35 : 0.7,
                returnOutcome: undefined,
                returnLabel: undefined,
              },
            })),
          }));
          await delay(halfDelay);
        }

        // Evaluate packet with the graph edges as they were when the run started
        const result = evaluatePacket(pkt, allNodeData, evalEdges);
        newResults.push(result);
        set({ results: [...newResults] });

        if (animate && !get().skipRequested) {
          const ret = returnOutcomeFor(result);
          set(curr => ({
            edges: curr.edges.map(e =>
              e.data?.isSimulating ? { ...e, data: { ...e.data, returnOutcome: ret.outcome, returnLabel: ret.label } } : e
            ),
          }));
          if (result.success) sounds.playPacketPass();
          else sounds.playPacketBlocked();
          await delay(halfDelay);
        }
      }

      // Clear edge animation
      set(curr => ({
        edges: curr.edges.map(e => ({
          ...e,
          data: { ...e.data, isSimulating: false, returnOutcome: undefined, returnLabel: undefined },
        })),
        activePacketIndex: -1,
        simStatus: 'completed',
        skipRequested: false,
        resultsCurrent: true,
      }));

      const { earned } = scoreRun(packets, newResults, allNodeData, level.targetBudget);
      set({ lastRunStars: earned });

      if (earned > 0) {
        const stars = get().starRecords;
        const updatedStars = { ...stars, [level.id]: Math.max(stars[level.id] || 0, earned) };
        set({ starRecords: updatedStars, earnedStars: earned, isVictoryModalOpen: true });
        sounds.playVictory();
        if (typeof window !== 'undefined') {
          try {
            confetti({ particleCount: earned * 50, spread: 70, origin: { y: 0.6 } });
          } catch {
            // Confetti is decoration only.
          }
        }
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
        resultsCurrent: false,
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

    openReportCard: () => {
      set({ isReportCardOpen: true });
      sounds.playClick();
    },

    closeReportCard: () => {
      set({ isReportCardOpen: false });
      sounds.playClick();
    },

    exportBoard: () => {
      const s = get();
      return buildBoardFile(s.currentLevelId, s.nodes, s.edges);
    },

    importBoard: (text: string) => {
      const s = get();
      const parsed = parseBoardFile(text, s.currentLevelId, s.currentLevel.title);
      if (!parsed.ok) {
        set({ toast: toastFrom(`Import failed: ${parsed.message}`, 'error') });
        return false;
      }

      // Essential nodes always come from the level, keeping their protection.
      const initial = mapLevelToFlow(s.currentLevel);
      const essentials = initial.nodes.filter(n => n.data.essential);
      const restored: string[] = [];
      const nodes: Node<CloudNodeData>[] = parsed.nodes.map(n => {
        const lvlNode = initial.nodes.find(i => i.id === n.id);
        if (lvlNode?.data.essential) return { ...n, data: { ...n.data, essential: true }, deletable: false };
        return { ...n, type: flowTypeFor(n.data.type), data: { ...n.data, essential: false }, deletable: true };
      });
      for (const ess of essentials) {
        if (!nodes.some(n => n.id === ess.id)) {
          nodes.push(ess);
          restored.push(ess.data.label);
        }
      }
      const ids = new Set(nodes.map(n => n.id));
      const edges: Edge[] = parsed.edges
        .filter(e => ids.has(e.source) && ids.has(e.target))
        .map(e => ({ ...e, type: 'packetEdge', animated: false }));

      set({
        nodes,
        edges,
        selectedNodeId: null,
        history: emptyHistory(),
        results: [],
        resultsCurrent: false,
        simStatus: 'idle',
        toast: toastFrom(
          restored.length > 0
            ? `Board imported. Restored required ${restored.length === 1 ? 'node' : 'nodes'}: ${restored.join(', ')}.`
            : 'Board imported.',
          restored.length > 0 ? 'warn' : 'success'
        ),
      });
      return true;
    },

    completeWelcome: ({ displayName, startTutorial }) => {
      set(state => ({
        isWelcomeOpen: false,
        profile: { ...state.profile, displayName: displayName.trim().slice(0, 40), firstRunCompleted: true },
      }));
      const target = startTutorial ? findLevel('round-0') : findLevel('round-1');
      if (target && target.id !== get().currentLevelId) openLevel(target);
      if (startTutorial) set({ isGuideOpen: true });
    },

    setDisplayName: (name: string) => {
      set(state => ({ profile: { ...state.profile, displayName: name.trim().slice(0, 40) } }));
    },

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),

    openGuide: () => set({ isGuideOpen: true }),
    exitGuide: () => set({ isGuideOpen: false }),

    setGuideStep: (step: number) => {
      const id = get().currentLevelId;
      set(state => ({
        onboarding: { ...state.onboarding, currentStep: { ...state.onboarding.currentStep, [id]: Math.max(0, step) } },
      }));
    },

    completeGuide: () => {
      const id = get().currentLevelId;
      set(state => ({
        isGuideOpen: false,
        onboarding: { ...state.onboarding, completed: { ...state.onboarding.completed, [id]: true } },
      }));
    },

    openAskAgent: () => {
      if (!get().resultsCurrent) return;
      set({ isAskAgentOpen: true });
    },
    closeAskAgent: () => set({ isAskAgentOpen: false }),

    dismissTwist: () => set({ twistBanner: null }),
    showToast: (message, tone = 'info') => set({ toast: toastFrom(message, tone) }),
    dismissToast: () => set({ toast: null }),
  };
});

// ── Persistence: debounced save of profile, progress and settings ──────────
const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function flushSave() {
  saveTimer = null;
  const s = useGameStore.getState();
  if (s.simStatus === 'running' || s.nodes.some(n => n.dragging)) {
    // Do not write mid-drag or mid-run; try again shortly.
    scheduleSave();
    return;
  }
  writeSave(
    {
      version: 2,
      profile: s.profile,
      progress: {
        stars: s.starRecords,
        boards: {
          ...s.savedBoards,
          [s.currentLevelId]: { levelRevision: levelRevision(s.currentLevel), ...serializeBoard(s.nodes, s.edges) },
        },
        onboarding: s.onboarding,
      },
      settings: { theme: s.theme, soundMuted: s.isSoundMuted, simSpeed: s.simSpeed },
    },
    s.storageStatus
  );
}

function scheduleSave() {
  if (useGameStore.getState().storageStatus !== 'ok') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
}

const PERSISTED_KEYS = [
  'nodes', 'edges', 'starRecords', 'theme', 'isSoundMuted', 'simSpeed',
  'profile', 'onboarding', 'savedBoards', 'currentLevelId',
] as const;

useGameStore.subscribe((s, prev) => {
  if (PERSISTED_KEYS.some(k => s[k] !== prev[k])) scheduleSave();
});
