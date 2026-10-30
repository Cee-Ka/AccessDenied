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
      <div className="bg-neo-surface border-2 border-neo-ink rounded-neo p-3 space-y-2 ">
        <div className="flex items-center justify-between">
          <span className="text-neo-muted font-medium">Resource ARN</span>
          <button
            onClick={handleCopyArn}
            className="flex items-center gap-1 text-[10px] text-neo-ink hover:text-neo-ink font-mono"
          >
            {copied ? <Check className="w-3 h-3 text-neo-ink" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="font-mono text-[11px] text-neo-ink break-all bg-neo-raised p-2 rounded border-2 border-neo-ink">
          {nodeData.arn}
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-neo-muted">Account ID</span>
          <span className="font-mono text-neo-ink">{nodeData.accountId}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neo-muted">Base Monthly Cost</span>
          <span className="font-mono text-neo-ink font-bold">${nodeData.monthlyCost}/mo</span>
        </div>
      </div>

      {/* S3 Controls */}
      {type === 's3' && (
        <div className="bg-neo-surface border-2 border-neo-ink rounded-neo p-3 space-y-3 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config?.blockPublicAccess ? (
                <ShieldCheck className="w-4 h-4 text-neo-ink" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-neo-ink" />
              )}
              <span className="font-semibold text-neo-ink">Block Public Access</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ blockPublicAccess: !config?.blockPublicAccess })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-sm border-2 border-neo-ink transition-colors duration-150 ${
                config?.blockPublicAccess ? 'bg-neo-lime neo-on-accent' : 'bg-neo-raised'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 mt-px ml-px transform rounded-sm bg-neo-surface border-2 border-neo-ink transition duration-150 ${
                  config?.blockPublicAccess ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-neo-muted leading-relaxed">
            When enabled, Amazon S3 blocks public bucket policies and ACLs, preventing anonymous internet scraping.
          </p>
        </div>
      )}

      {/* EC2 Controls */}
      {type === 'ec2' && (
        <div className="bg-neo-surface border-2 border-neo-ink rounded-neo p-3 space-y-3 ">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neo-ink">Metadata Service (IMDS)</span>
            <div className="flex rounded bg-neo-raised p-0.5 border-2 border-neo-ink">
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v1' })}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold border-2 ${
                  config?.imdsVersion !== 'v2'
                    ? 'bg-neo-coral neo-on-accent border-neo-ink'
                    : 'border-transparent text-neo-muted hover:text-neo-ink'
                }`}
              >
                IMDSv1
              </button>
              <button
                onClick={() => onUpdateConfig({ imdsVersion: 'v2', imdsHopLimit: 1 })}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold border-2 ${
                  config?.imdsVersion === 'v2'
                    ? 'bg-neo-lime neo-on-accent border-neo-ink'
                    : 'border-transparent text-neo-muted hover:text-neo-ink'
                }`}
              >
                IMDSv2
              </button>
            </div>
          </div>

          {config?.imdsVersion === 'v2' && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-neo-muted">Response Hop Limit</span>
              <select
                value={config?.imdsHopLimit ?? 1}
                onChange={e => onUpdateConfig({ imdsHopLimit: parseInt(e.target.value, 10) })}
                className="bg-neo-raised border-2 border-neo-ink text-neo-ink rounded px-2 py-0.5 text-xs font-mono focus:border-neo-ink"
              >
                <option value={1}>1 (Strict container/host isolation)</option>
                <option value={2}>2 (Permit container bridge hops)</option>
              </select>
            </div>
          )}
          <p className="text-[11px] text-neo-muted leading-relaxed">
            IMDSv2 requires session-oriented requests with PUT headers, neutralizing SSRF credential theft.
          </p>
        </div>
      )}

      {/* IAM Role ExternalId Controls */}
      {type === 'iam_role' && (
        <div className="bg-neo-surface border-2 border-neo-ink rounded-neo p-3 space-y-2 ">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-neo-ink" />
            <span className="font-semibold text-neo-ink">Required sts:ExternalId</span>
          </div>
          <input
            type="text"
            value={config?.requireExternalId || ''}
            onChange={e => onUpdateConfig({ requireExternalId: e.target.value })}
            placeholder="e.g. ac-9841-sec (empty = vulnerable)"
            className="w-full bg-neo-raised border-2 border-neo-ink rounded px-2.5 py-1.5 text-xs font-mono text-neo-ink placeholder-neo-muted focus:outline-none focus:border-neo-ink"
          />
          <p className="text-[11px] text-neo-muted leading-relaxed">
            Protects against Confused Deputy attacks when third-party vendors assume this role.
          </p>
        </div>
      )}

      {/* Network Placement */}
      {['ec2', 'lambda'].includes(type) && (
        <div className="bg-neo-surface border-2 border-neo-ink rounded-neo p-3 space-y-2 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-neo-ink" />
              <span className="font-semibold text-neo-ink">Private Subnet Attachment</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ inPrivateSubnet: !config?.inPrivateSubnet })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-sm border-2 border-neo-ink transition-colors duration-150 ${
                config?.inPrivateSubnet ? 'bg-neo-lime neo-on-accent' : 'bg-neo-raised'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 mt-px ml-px transform rounded-sm bg-neo-surface border-2 border-neo-ink transition duration-150 ${
                  config?.inPrivateSubnet ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-neo-muted leading-relaxed">
            Placing compute in a private subnet blocks direct internet ingress, but requires a NAT Gateway or VPC Endpoint for AWS API egress.
          </p>
        </div>
      )}
    </div>
  );
}
