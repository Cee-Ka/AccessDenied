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

  const row = 'flex items-center justify-between gap-3 py-2.5 border-b-2 border-neo-ink last:border-0';
  const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded bg-neo-raised hover:bg-neo-raised text-xs font-semibold text-neo-ink border-2 border-neo-ink';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-scrim " role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="w-full max-w-md neo-modal">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-neo-ink">
          <h2 id="settings-title" className="neo-heading text-sm font-bold text-neo-ink">Settings</h2>
          <button onClick={closeSettings} className="neo-icon-btn" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-2 text-xs">
          {storageStatus !== 'ok' && (
            <div className="my-2 flex items-start gap-2 rounded border-2 border-neo-ink bg-neo-yellow p-2.5 text-neo-on-accent neo-on-accent ">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {storageStatus === 'unavailable'
                ? 'Browser storage is blocked. Progress will not be saved after you close this tab.'
                : 'Your saved progress is from a newer version. This session will not overwrite it.'}
            </div>
          )}

          <label className={row}>
            <span className="font-semibold text-neo-ink">Display name</span>
            <input
              defaultValue={profile.displayName}
              onBlur={e => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder="Your name"
              className="w-44 bg-neo-raised border-2 border-neo-ink rounded px-2.5 py-1.5 text-xs text-neo-ink placeholder-neo-muted focus:outline-none focus:border-neo-ink"
            />
          </label>

          <div className={row}>
            <span className="font-semibold text-neo-ink">Theme</span>
            <button onClick={toggleTheme} className={btn}>
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          <div className={row}>
            <span className="font-semibold text-neo-ink">Sound</span>
            <button onClick={toggleSound} className={btn}>
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isSoundMuted ? 'Off' : 'On'}
            </button>
          </div>

          <div className={row}>
            <div>
              <div className="font-semibold text-neo-ink">Board for "{currentLevel.title}"</div>
              <div className="text-[11px] text-neo-muted">Save or load this level's board as a JSON file.</div>
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
              <div className="font-semibold text-neo-ink">Start over</div>
              <div className="text-[11px] text-neo-muted">Reset this level's board. Your stars are kept.</div>
            </div>
            <button onClick={() => setPending('start-over')} className={btn}>
              <RotateCcw className="w-3.5 h-3.5" /> Start over
            </button>
          </div>

          <div className={row}>
            <div>
              <div className="font-semibold text-neo-ink ">Reset all progress</div>
              <div className="text-[11px] text-neo-muted">Clears every star, board and tutorial step.</div>
            </div>
            <button onClick={() => setPending('reset-all')} className={`${btn} hover:border-neo-ink hover:text-neo-ink`}>
              <Trash2 className="w-3.5 h-3.5" /> Reset all
            </button>
          </div>
        </div>

        {pending && (
          <div className="px-5 py-3 border-t-2 border-neo-ink bg-neo-coral flex items-center justify-between gap-3 text-xs neo-on-accent" role="alertdialog" aria-label="Confirm">
            <span className="text-neo-ink font-semibold">
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
                className="neo-btn neo-btn-danger"
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
