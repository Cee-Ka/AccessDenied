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
      <div className="bg-obsidian-900 border border-obsidian-border rounded-xl p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-obsidian-muted font-medium">Resource ARN</span>
          <button
            onClick={handleCopyArn}
            className="flex items-center gap-1 text-[10px] text-brand-orange hover:text-amber-300 font-mono"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="font-mono text-[11px] text-obsidian-text break-all bg-obsidian-box p-2 rounded border border-obsidian-border">
          {nodeData.arn}
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-obsidian-muted">Account ID</span>
          <span className="font-mono text-obsidian-text">{nodeData.accountId}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-obsidian-muted">Base Monthly Cost</span>
          <span className="font-mono text-brand-orange font-bold">${nodeData.monthlyCost}/mo</span>
        </div>
      </div>

      {/* S3 Controls */}
      {type === 's3' && (
        <div className="bg-obsidian-900 border border-obsidian-border rounded-xl p-3 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config?.blockPublicAccess ? (
                <ShieldCheck className="w-4 h-4 text-brand-orange" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              )}
              <span className="font-semibold text-obsidian-text">Block Public Access</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ blockPublicAccess: !config?.blockPublicAccess })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config?.blockPublicAccess ? 'bg-brand-orange' : 'bg-obsidian-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-obsidian-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config?.blockPublicAccess ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-obsidian-muted leading-relaxed">
            When enabled, Amazon S3 blocks public bucket policies and ACLs, preventing anonymous internet scraping.
          </p>
        </div>
      )}

      {/* EC2 Controls */}
      {type === 'ec2' && (
        <div className="bg-obsidian-900 border border-obsidian-border rounded-xl p-3 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-obsidian-text">Metadata Service (IMDS)</span>
            <div className="flex rounded-lg bg-obsidian-box p-0.5 border border-obsidian-border">
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v1' })}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  config?.imdsVersion !== 'v2'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30'
                    : 'text-obsidian-muted hover:text-obsidian-text'
                }`}
              >
                IMDSv1
              </button>
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v2', imdsHopLimit: 1 })}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  config?.imdsVersion === 'v2'
                    ? 'bg-brand-orange text-black font-extrabold shadow-sm'
                    : 'text-obsidian-muted hover:text-obsidian-text'
                }`}
              >
                IMDSv2
              </button>
            </div>
          </div>

          {config?.imdsVersion === 'v2' && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-obsidian-muted">Response Hop Limit</span>
              <select
                value={config?.imdsHopLimit ?? 1}
                onChange={e => onUpdateConfig({ imdsHopLimit: parseInt(e.target.value, 10) })}
                className="bg-obsidian-box border border-obsidian-border text-obsidian-text rounded px-2 py-0.5 text-xs font-mono focus:border-brand-orange"
              >
                <option value={1}>1 (Strict container/host isolation)</option>
                <option value={2}>2 (Permit container bridge hops)</option>
              </select>
            </div>
          )}
          <p className="text-[11px] text-obsidian-muted leading-relaxed">
            IMDSv2 requires session-oriented requests with PUT headers, neutralizing SSRF credential theft.
          </p>
        </div>
      )}

      {/* IAM Role ExternalId Controls */}
      {type === 'iam_role' && (
        <div className="bg-obsidian-900 border border-obsidian-border rounded-xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-orange" />
            <span className="font-semibold text-obsidian-text">Required sts:ExternalId</span>
          </div>
          <input
            type="text"
            value={config?.requireExternalId || ''}
            onChange={e => onUpdateConfig({ requireExternalId: e.target.value })}
            placeholder="e.g. ac-9841-sec (empty = vulnerable)"
            className="w-full bg-obsidian-box border border-obsidian-border rounded px-2.5 py-1.5 text-xs font-mono text-obsidian-text placeholder-obsidian-muted dark:placeholder-obsidian-muted focus:outline-none focus:border-brand-orange"
          />
          <p className="text-[11px] text-obsidian-muted leading-relaxed">
            Protects against Confused Deputy attacks when third-party vendors assume this role.
          </p>
        </div>
      )}

      {/* Network Placement */}
      {['ec2', 'lambda'].includes(type) && (
        <div className="bg-obsidian-900 border border-obsidian-border rounded-xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-brand-orange" />
              <span className="font-semibold text-obsidian-text">Private Subnet Attachment</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ inPrivateSubnet: !config?.inPrivateSubnet })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config?.inPrivateSubnet ? 'bg-brand-orange' : 'bg-obsidian-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config?.inPrivateSubnet ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-obsidian-muted leading-relaxed">
            Placing compute in a private subnet blocks direct internet ingress, but requires a NAT Gateway or VPC Endpoint for AWS API egress.
          </p>
        </div>
      )}
    </div>
  );
}
