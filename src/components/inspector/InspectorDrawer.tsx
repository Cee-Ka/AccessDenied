import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { ConfigToggles } from './ConfigToggles';
import { PolicyEditor } from './PolicyEditor';
import { X, Sliders, FileJson, Trash2, Lock } from 'lucide-react';
import { InfoPopover } from '../common/InfoPopover';
import { POLICY_TAB_CONCEPT } from '../../content/concepts';
import { ESSENTIAL_NODE_LABEL } from '../../store/essential';

export function InspectorDrawer() {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    updateNodeConfig,
    updateNodePolicy,
    removeNodeFromBoard,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'config' | 'identity' | 'resource' | 'trust' | 'boundary' | 'scp'>('config');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (!selectedNode) return;
    const isPrincipal = ['iam_user', 'iam_role', 'ec2', 'lambda', 'cognito'].includes(selectedNode.data.type);
    const isResource = ['s3', 'dynamodb', 'kms', 'secrets_manager'].includes(selectedNode.data.type);
    const isRole = ['iam_role', 'ec2', 'lambda'].includes(selectedNode.data.type);
    const hasScp = Boolean(selectedNode.data.scpPolicies && selectedNode.data.scpPolicies.length > 0);

    const validTabs: string[] = ['config'];
    if (isPrincipal) validTabs.push('identity', 'boundary');
    if (isRole) validTabs.push('trust');
    if (isResource) validTabs.push('resource');
    if (isPrincipal || hasScp) validTabs.push('scp');

    if (!validTabs.includes(activeTab)) {
      setActiveTab('config');
    }
  }, [selectedNode?.id, selectedNode?.data.type]);

  if (!selectedNode) return null;

  const { data } = selectedNode;
  const isPrincipal = ['iam_user', 'iam_role', 'ec2', 'lambda', 'cognito'].includes(data.type);
  const isResource = ['s3', 'dynamodb', 'kms', 'secrets_manager'].includes(data.type);
  const isRole = ['iam_role', 'ec2', 'lambda'].includes(data.type);
  const hasScp = Boolean(data.scpPolicies && data.scpPolicies.length > 0);

  return (
    <div className="absolute right-0 top-14 bottom-0 w-96 neo-panel border-l-3 flex flex-col z-30 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-neo-ink">
        <div>
          <div className="text-xs font-bold text-neo-ink flex items-center gap-1.5">
            <span>{data.label}</span>
            <InfoPopover conceptId={data.type} />
          </div>
          <div className="text-[10px] text-neo-muted font-mono capitalize">
            {data.type.replace('_', ' ')} Inspector
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data.essential ? (
            <span title={ESSENTIAL_NODE_LABEL} className="relative inline-flex">
              <button
                disabled
                className="p-1.5 rounded text-neo-muted opacity-40 cursor-not-allowed"
                aria-label={`Delete node: disabled. ${ESSENTIAL_NODE_LABEL}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Lock className="w-2.5 h-2.5 absolute bottom-1 right-1 text-neo-muted pointer-events-none" aria-hidden />
            </span>
          ) : (
            <button
              onClick={() => removeNodeFromBoard(selectedNode.id)}
              className="p-1.5 rounded text-neo-muted hover:text-neo-ink hover:bg-neo-coral transition-colors"
              title="Delete Node"
              aria-label="Delete node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => selectNode(null)}
            className="neo-icon-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-2 py-2 border-b-2 border-neo-ink bg-neo-raised overflow-x-auto text-xs gap-1.5">
        <button
          onClick={() => setActiveTab('config')}
          className={`neo-tab shrink-0 ${
            activeTab === 'config'
              ? 'neo-tab-active'
              : ''
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Config
        </button>

        {isPrincipal && (
          <span className="flex items-center gap-0.5 shrink-0 rounded" data-tour="tab-identity">
            <button
              onClick={() => setActiveTab('identity')}
              className={`neo-tab shrink-0 ${
                activeTab === 'identity'
                  ? 'neo-tab-active'
                  : ''
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Identity Policy
            </button>
            <InfoPopover conceptId={POLICY_TAB_CONCEPT.identity} />
          </span>
        )}

        {isRole && (
          <span className="flex items-center gap-0.5 shrink-0 rounded" data-tour="tab-trust">
            <button
              onClick={() => setActiveTab('trust')}
              className={`neo-tab shrink-0 ${
                activeTab === 'trust'
                  ? 'neo-tab-active'
                  : ''
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Trust Policy
            </button>
            <InfoPopover conceptId={POLICY_TAB_CONCEPT.trust} />
          </span>
        )}

        {isResource && (
          <span className="flex items-center gap-0.5 shrink-0 rounded" data-tour="tab-resource">
            <button
              onClick={() => setActiveTab('resource')}
              className={`neo-tab shrink-0 ${
                activeTab === 'resource'
                  ? 'neo-tab-active'
                  : ''
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Resource Policy
            </button>
            <InfoPopover conceptId={POLICY_TAB_CONCEPT.resource} />
          </span>
        )}

        {isPrincipal && (
          <span className="flex items-center gap-0.5 shrink-0 rounded" data-tour="tab-boundary">
            <button
              onClick={() => setActiveTab('boundary')}
              className={`neo-tab shrink-0 ${
                activeTab === 'boundary'
                  ? 'neo-tab-active'
                  : ''
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Boundary
            </button>
            <InfoPopover conceptId={POLICY_TAB_CONCEPT.boundary} />
          </span>
        )}

        {(isPrincipal || hasScp) && (
          <span className="flex items-center gap-0.5 shrink-0 rounded" data-tour="tab-scp">
            <button
              onClick={() => setActiveTab('scp')}
              className={`neo-tab shrink-0 ${
                activeTab === 'scp'
                  ? 'neo-tab-active'
                  : ''
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              SCP Guardrail
            </button>
            <InfoPopover conceptId={POLICY_TAB_CONCEPT.scp} />
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'config' && (
          <ConfigToggles
            nodeData={data}
            onUpdateConfig={updates => updateNodeConfig(selectedNode.id, updates)}
          />
        )}

        {activeTab === 'identity' && (
          <div className="h-full p-3">
            <PolicyEditor
              title="Identity Policy Document"
              initialPolicy={data.identityPolicies?.[0]}
              onChange={doc => updateNodePolicy(selectedNode.id, 'identity', 0, doc)}
            />
          </div>
        )}

        {activeTab === 'resource' && (
          <div className="h-full p-3">
            <PolicyEditor
              title="Resource Policy Document"
              initialPolicy={data.resourcePolicy}
              onChange={doc => updateNodePolicy(selectedNode.id, 'resource', 0, doc)}
            />
          </div>
        )}

        {activeTab === 'trust' && (
          <div className="h-full p-3">
            <PolicyEditor
              title="AssumeRole Trust Policy Document"
              initialPolicy={data.trustPolicy}
              onChange={doc => updateNodePolicy(selectedNode.id, 'trust', 0, doc)}
            />
          </div>
        )}

        {activeTab === 'boundary' && (
          <div className="h-full p-3">
            <PolicyEditor
              title="Permission Boundary Document"
              initialPolicy={data.permissionBoundary}
              onChange={doc => updateNodePolicy(selectedNode.id, 'boundary', 0, doc)}
            />
          </div>
        )}

        {activeTab === 'scp' && (
          <div className="h-full p-3">
            <PolicyEditor
              title="Organizations Service Control Policy (SCP)"
              initialPolicy={data.scpPolicies?.[0]}
              onChange={doc => updateNodePolicy(selectedNode.id, 'scp', 0, doc)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
