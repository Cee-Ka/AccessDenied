import { CloudNodeData } from '../../types/engine';
import { ShieldCheck, ShieldAlert, KeyRound, Network, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ConfigTogglesProps {
  nodeData: CloudNodeData;
  onUpdateConfig: (updates: Partial<CloudNodeData['config']>) => void;
}

export function ConfigToggles({ nodeData, onUpdateConfig }: ConfigTogglesProps) {
  const [copied, setCopied] = useState(false);
  const { config, type } = nodeData;

  const handleCopyArn = () => {
    navigator.clipboard.writeText(nodeData.arn);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Node Info Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Resource ARN</span>
          <button
            onClick={handleCopyArn}
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="font-mono text-[11px] text-slate-300 break-all bg-slate-950 p-2 rounded border border-slate-800/80">
          {nodeData.arn}
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-slate-400">Account ID</span>
          <span className="font-mono text-slate-300">{nodeData.accountId}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Base Monthly Cost</span>
          <span className="font-mono text-emerald-400 font-semibold">${nodeData.monthlyCost}/mo</span>
        </div>
      </div>

      {/* S3 Controls */}
      {type === 's3' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config?.blockPublicAccess ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              )}
              <span className="font-medium text-slate-200">Block Public Access</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ blockPublicAccess: !config?.blockPublicAccess })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config?.blockPublicAccess ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config?.blockPublicAccess ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            When enabled, Amazon S3 blocks public bucket policies and ACLs, preventing anonymous internet scraping.
          </p>
        </div>
      )}

      {/* EC2 Controls */}
      {type === 'ec2' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">Metadata Service (IMDS)</span>
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v1' })}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  config?.imdsVersion !== 'v2'
                    ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IMDSv1
              </button>
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v2', imdsHopLimit: 1 })}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  config?.imdsVersion === 'v2'
                    ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IMDSv2
              </button>
            </div>
          </div>

          {config?.imdsVersion === 'v2' && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Response Hop Limit</span>
              <select
                value={config?.imdsHopLimit ?? 1}
                onChange={e => onUpdateConfig({ imdsHopLimit: parseInt(e.target.value, 10) })}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                <option value={1}>1 (Strict container/host isolation)</option>
                <option value={2}>2 (Permit container bridge hops)</option>
              </select>
            </div>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            IMDSv2 requires session-oriented requests with PUT headers, neutralizing SSRF credential theft.
          </p>
        </div>
      )}

      {/* IAM Role ExternalId Controls */}
      {type === 'iam_role' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-slate-200">Required sts:ExternalId</span>
          </div>
          <input
            type="text"
            value={config?.requireExternalId || ''}
            onChange={e => onUpdateConfig({ requireExternalId: e.target.value })}
            placeholder="e.g. ac-9841-sec (empty = vulnerable)"
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Protects against Confused Deputy attacks when third-party vendors assume this role.
          </p>
        </div>
      )}

      {/* Network Placement */}
      {['ec2', 'lambda'].includes(type) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-slate-200">Private Subnet Attachment</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ inPrivateSubnet: !config?.inPrivateSubnet })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config?.inPrivateSubnet ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config?.inPrivateSubnet ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Placing compute in a private subnet blocks direct internet ingress, but requires a NAT Gateway or VPC Endpoint for AWS API egress.
          </p>
        </div>
      )}
    </div>
  );
}
