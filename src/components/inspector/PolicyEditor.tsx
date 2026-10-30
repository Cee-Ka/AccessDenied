import { useState, useEffect, useRef } from 'react';
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

const EMPTY_POLICY = '{\n  "Version": "2012-10-17",\n  "Statement": []\n}';

export function PolicyEditor({ initialPolicy, onChange, title }: PolicyEditorProps) {
  const [rawText, setRawText] = useState(() =>
    initialPolicy ? JSON.stringify(initialPolicy, null, 2) : EMPTY_POLICY
  );
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync from the store only when the stored policy differs from what is typed
  // (undo, import, another node). Echoes of our own edits must not reformat the text.
  const rawTextRef = useRef(rawText);
  rawTextRef.current = rawText;

  useEffect(() => {
    let typed: unknown;
    try {
      typed = JSON.parse(rawTextRef.current);
    } catch {
      typed = undefined;
    }
    let next: string | null = null;
    if (initialPolicy) {
      if (JSON.stringify(typed) !== JSON.stringify(initialPolicy)) next = JSON.stringify(initialPolicy, null, 2);
    } else if (typed === undefined || (typed as { Statement?: unknown[] }).Statement?.length) {
      next = EMPTY_POLICY;
    }
    if (next !== null) {
      setRawText(next);
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
    <div className="flex flex-col h-full neo-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-neo-ink bg-neo-raised">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-neo-ink" />
          <span className="text-xs font-bold text-neo-ink">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={insertAllowTemplate}
            className="neo-btn neo-btn-secondary shadow-neo-sm px-2 py-0.5 text-[10px] font-mono"
          >
            + Allow
          </button>
          <button
            onClick={insertDenyTemplate}
            className="neo-btn neo-btn-secondary shadow-neo-sm px-2 py-0.5 text-[10px] font-mono"
          >
            + Deny
          </button>
          <button
            onClick={formatCode}
            className="neo-btn neo-btn-secondary shadow-neo-sm px-2 py-0.5 text-[10px] font-mono flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-neo-ink" />
            Format
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-neo-raised">
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
      <div className="flex items-center justify-between px-3 py-1.5 border-t-2 border-neo-ink bg-neo-raised text-[10px] font-mono">
        <div className="flex items-center gap-1.5 truncate">
          {parseError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-neo-ink shrink-0" />
              <span className="text-neo-ink truncate">{parseError}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-neo-ink shrink-0" />
              <span className="text-neo-ink font-semibold">Valid Policy JSON</span>
            </>
          )}
        </div>
        <div className="text-neo-muted shrink-0 ml-2">
          {byteCount} bytes / 2048
        </div>
      </div>
    </div>
  );
}
