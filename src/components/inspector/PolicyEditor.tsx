import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { PolicyDocument } from '../../types/engine';
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

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={insertAllowTemplate}
            className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
          >
            + Allow
          </button>
          <button
            onClick={insertDenyTemplate}
            className="text-[10px] px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
          >
            + Deny
          </button>
          <button
            onClick={formatCode}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Format
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={rawText}
          height="100%"
          theme={vscodeDark}
          extensions={[json()]}
          onChange={handleCodeChange}
          className="text-xs font-mono"
        />
      </div>

      {/* Footer bar with syntax status & byte size */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 truncate">
          {parseError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-rose-400 truncate">{parseError}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400">Valid Policy JSON</span>
            </>
          )}
        </div>
        <div className="text-slate-500 shrink-0 ml-2">
          {byteCount} bytes / 2048
        </div>
      </div>
    </div>
  );
}
