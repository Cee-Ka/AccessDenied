import { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Trash2, Sun, Moon, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

type Pending = 'start-over' | 'reset-all' | null;

export function downloadBoard(json: string, levelId: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `access-denied-${levelId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    profile,
    setDisplayName,
    theme,
    toggleTheme,
    isSoundMuted,
    toggleSound,
    storageStatus,
    currentLevel,
    exportBoard,
    importBoard,
    resetCurrentLevel,
    resetCampaignProgress,
  } = useGameStore();
  const [pending, setPending] = useState<Pending>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isSettingsOpen) return null;

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (importBoard(text)) closeSettings();
    if (fileRef.current) fileRef.current.value = '';
  };

  const row = 'flex items-center justify-between gap-3 py-2.5 border-b border-obsidian-border last:border-0';
  const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-xs font-semibold text-obsidian-text border border-obsidian-border';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-scrim backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="w-full max-w-md bg-obsidian-900 border border-obsidian-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-obsidian-border">
          <h2 id="settings-title" className="text-sm font-bold text-obsidian-text">Settings</h2>
          <button onClick={closeSettings} className="p-1.5 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-850" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-2 text-xs">
          {storageStatus !== 'ok' && (
            <div className="my-2 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {storageStatus === 'unavailable'
                ? 'Browser storage is blocked. Progress will not be saved after you close this tab.'
                : 'Your saved progress is from a newer version. This session will not overwrite it.'}
            </div>
          )}

          <label className={row}>
            <span className="font-semibold text-obsidian-text">Display name</span>
            <input
              defaultValue={profile.displayName}
              onBlur={e => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder="Your name"
              className="w-44 bg-obsidian-box border border-obsidian-border rounded-lg px-2.5 py-1.5 text-xs text-obsidian-text placeholder-obsidian-muted focus:outline-none focus:border-brand-orange"
            />
          </label>

          <div className={row}>
            <span className="font-semibold text-obsidian-text">Theme</span>
            <button onClick={toggleTheme} className={btn}>
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          <div className={row}>
            <span className="font-semibold text-obsidian-text">Sound</span>
            <button onClick={toggleSound} className={btn}>
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isSoundMuted ? 'Off' : 'On'}
            </button>
          </div>

          <div className={row}>
            <div>
              <div className="font-semibold text-obsidian-text">Board for "{currentLevel.title}"</div>
              <div className="text-[11px] text-obsidian-muted">Save or load this level's board as a JSON file.</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => downloadBoard(exportBoard(), currentLevel.id)} className={btn} title="Export board">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => fileRef.current?.click()} className={btn} title="Import board">
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => onImportFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className={row}>
            <div>
              <div className="font-semibold text-obsidian-text">Start over</div>
              <div className="text-[11px] text-obsidian-muted">Reset this level's board. Your stars are kept.</div>
            </div>
            <button onClick={() => setPending('start-over')} className={btn}>
              <RotateCcw className="w-3.5 h-3.5" /> Start over
            </button>
          </div>

          <div className={row}>
            <div>
              <div className="font-semibold text-rose-600 dark:text-rose-400">Reset all progress</div>
              <div className="text-[11px] text-obsidian-muted">Clears every star, board and tutorial step.</div>
            </div>
            <button onClick={() => setPending('reset-all')} className={`${btn} hover:border-rose-500 hover:text-rose-500`}>
              <Trash2 className="w-3.5 h-3.5" /> Reset all
            </button>
          </div>
        </div>

        {pending && (
          <div className="px-5 py-3 border-t border-obsidian-border bg-rose-500/5 flex items-center justify-between gap-3 text-xs" role="alertdialog" aria-label="Confirm">
            <span className="text-obsidian-text font-semibold">
              {pending === 'start-over' ? 'Reset this board to its starting state?' : 'Delete all progress on this device?'}
            </span>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setPending(null)} className={btn} autoFocus>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pending === 'start-over') resetCurrentLevel();
                  else resetCampaignProgress();
                  setPending(null);
                  closeSettings();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                {pending === 'start-over' ? 'Start over' : 'Reset everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
