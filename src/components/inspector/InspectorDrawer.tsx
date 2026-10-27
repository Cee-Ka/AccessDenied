import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { ConfigToggles } from './ConfigToggles';
import { PolicyEditor } from './PolicyEditor';
import { X, Sliders, FileJson, Trash2 } from 'lucide-react';

export function InspectorDrawer() {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    updateNodeConfig,
    updateNodePolicy,
    removeNodeFromBoard,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'config' | 'identity' | 'resource' | 'trust' | 'boundary'>('config');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) return null;

  const { data } = selectedNode;
  const isPrincipal = ['iam_user', 'iam_role', 'ec2', 'lambda', 'cognito'].includes(data.type);
  const isResource = ['s3', 'dynamodb', 'kms', 'secrets_manager'].includes(data.type);
  const isRole = data.type === 'iam_role';

  return (
    <div className="absolute right-0 top-14 bottom-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
            <span>{data.label}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono capitalize">
            {data.type.replace('_', ' ')} Inspector
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => removeNodeFromBoard(selectedNode.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            title="Delete Node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-2 py-1.5 border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs gap-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
            activeTab === 'config'
              ? 'bg-slate-800 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Config
        </button>

        {isPrincipal && (
          <button
            onClick={() => setActiveTab('identity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              activeTab === 'identity'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Identity Policy
          </button>
        )}

        {isRole && (
          <button
            onClick={() => setActiveTab('trust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              activeTab === 'trust'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Trust Policy
          </button>
        )}

        {isResource && (
          <button
            onClick={() => setActiveTab('resource')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              activeTab === 'resource'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Resource Policy
          </button>
        )}

        {isPrincipal && (
          <button
            onClick={() => setActiveTab('boundary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              activeTab === 'boundary'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Boundary
          </button>
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
      </div>
    </div>
  );
}
