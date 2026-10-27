import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { PolicyDocument } from '../../types/engine';
import { useGameStore } from '../../store/useGameStore';
import { AlertCircle, CheckCircle2, Code2, Sparkles } from 'lucide-react';

interface PolicyEditorProps {
  initialPolicy?: PolicyDocument;
  onChange: (policy: PolicyDocument) => void;
  title: string;
}

export function PolicyEditor({ initialPolicy, onChange, title }: PolicyEditorProps) {
  const [rawText, setRawText] = useState(() =>
    initialPolicy ? JSON.stringify(initialPolicy, null, 2) : '{\n  "Version": "2012-10-17",\n  "Statement": []\n}'
  );
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPolicy) {
      setRawText(JSON.stringify(initialPolicy, null, 2));
      setParseError(null);
    }
  }, [initialPolicy]);

  const handleCodeChange = (val: string) => {
    setRawText(val);
    try {
      const parsed = JSON.parse(val);
      if (!parsed || typeof parsed !== 'object') {
        setParseError('Root must be a JSON object');
        return;
      }
      if (!Array.isArray(parsed.Statement)) {
        setParseError('Missing required array "Statement"');
        return;
      }
      for (let i = 0; i < parsed.Statement.length; i++) {
        const stmt = parsed.Statement[i];
        if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
          setParseError(`Statement[${i}]: Effect must be "Allow" or "Deny"`);
          return;
        }
      }
      setParseError(null);
      onChange(parsed as PolicyDocument);
    } catch (err: unknown) {
      setParseError((err as Error).message);
    }
  };

  const formatCode = () => {
    try {
      const parsed = JSON.parse(rawText);
      const formatted = JSON.stringify(parsed, null, 2);
      setRawText(formatted);
      setParseError(null);
    } catch {
      // Ignore if unparseable
    }
  };

  const insertAllowTemplate = () => {
    try {
      const parsed = JSON.parse(rawText) || { Version: '2012-10-17', Statement: [] };
      parsed.Statement = parsed.Statement || [];
      parsed.Statement.push({
        Sid: `AllowRule${parsed.Statement.length + 1}`,
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::example-bucket/*'],
      });
      const updated = JSON.stringify(parsed, null, 2);
      setRawText(updated);
      setParseError(null);
      onChange(parsed);
    } catch {
      //
    }
  };

  const insertDenyTemplate = () => {
    try {
      const parsed = JSON.parse(rawText) || { Version: '2012-10-17', Statement: [] };
      parsed.Statement = parsed.Statement || [];
      parsed.Statement.push({
        Sid: `DenyRule${parsed.Statement.length + 1}`,
        Effect: 'Deny',
        Action: ['*'],
        Resource: ['*'],
        Condition: {
          StringNotEquals: {
            'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/AdminRole',
          },
        },
      });
      const updated = JSON.stringify(parsed, null, 2);
      setRawText(updated);
      setParseError(null);
      onChange(parsed);
    } catch {
      //
    }
  };

  const byteCount = new Blob([rawText]).size;
  const theme = useGameStore(s => s.theme);

  return (
    <div className="flex flex-col h-full bg-obsidian-900 border border-obsidian-border rounded-xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 bg-obsidian-850 border-b border-obsidian-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-brand-orange" />
          <span className="text-xs font-bold text-obsidian-text">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={insertAllowTemplate}
            className="text-[10px] px-2 py-0.5 rounded bg-obsidian-box hover:bg-obsidian-800 text-brand-orange border border-orange-500/40 transition-colors font-mono font-bold"
          >
            + Allow
          </button>
          <button
            onClick={insertDenyTemplate}
            className="text-[10px] px-2 py-0.5 rounded bg-obsidian-box hover:bg-obsidian-800 text-rose-500 border border-rose-500/40 transition-colors font-mono font-bold"
          >
            + Deny
          </button>
          <button
            onClick={formatCode}
            className="text-[10px] px-2 py-0.5 rounded bg-obsidian-850 hover:bg-obsidian-800 text-obsidian-text border border-obsidian-border flex items-center gap-1 transition-colors font-mono"
          >
            <Sparkles className="w-3 h-3 text-brand-orange" />
            Format
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-obsidian-box">
        <CodeMirror
          value={rawText}
          height="100%"
          theme={theme === 'dark' ? vscodeDark : vscodeLight}
          extensions={[json()]}
          onChange={handleCodeChange}
          className="text-xs font-mono"
        />
      </div>

      {/* Footer bar with syntax status & byte size */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-obsidian-850 border-t border-obsidian-border text-[10px] font-mono">
        <div className="flex items-center gap-1.5 truncate">
          {parseError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-rose-500 truncate">{parseError}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              <span className="text-brand-orange font-semibold">Valid Policy JSON</span>
            </>
          )}
        </div>
        <div className="text-obsidian-muted shrink-0 ml-2">
          {byteCount} bytes / 2048
        </div>
      </div>
    </div>
  );
}
