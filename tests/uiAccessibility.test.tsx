// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../src/store/useGameStore';
import { ALL_LEVELS, STAGE_1_1, STAGE_1_2, STAGE_5_3 } from '../src/levels';
import App from '../src/App';
import { HintDrawer } from '../src/components/coach/HintDrawer';
import { IAMCoachModal } from '../src/components/coach/IAMCoachModal';
import { MissionReportCardModal } from '../src/components/coach/MissionReportCardModal';
import { VictoryModal } from '../src/components/modals/VictoryModal';
import { ConfigToggles } from '../src/components/inspector/ConfigToggles';
import { PolicyEditor } from '../src/components/inspector/PolicyEditor';
import { TopNav } from '../src/components/hud/TopNav';
import { freshLevel } from './helpers';

vi.mock('../src/components/canvas/FlowCanvas', () => ({
  FlowCanvas: () => <div data-testid="mock-flow-canvas" />,
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      aria-label="Policy JSON editor"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

afterEach(cleanup);

describe('UI accessibility and layout fixes', () => {
  it('resets unlocked HintDrawer tiers when switching levels', () => {
    freshLevel(STAGE_1_1.id);
    const { rerender } = render(<HintDrawer isOpen={true} onClose={() => {}} />);

    const hint2Btn = screen.getByRole('button', { name: /Hint 2:/ });
    expect(hint2Btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(hint2Btn);
    expect(screen.getByRole('button', { name: /Hint 2:/ }).getAttribute('aria-expanded')).toBe('true');

    useGameStore.setState({ starRecords: { [STAGE_1_1.id]: 1 } });
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    rerender(<HintDrawer isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Hint 2:/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('gives IAMCoachModal, MissionReportCardModal, and VictoryModal dialog roles and Escape dismissal', () => {
    freshLevel(STAGE_1_1.id);

    // 1. MissionReportCardModal
    useGameStore.setState({ isReportCardOpen: true });
    render(<MissionReportCardModal />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useGameStore.getState().isReportCardOpen).toBe(false);
    cleanup();

    // 2. IAMCoachModal
    useGameStore.setState({
      isCoachModalOpen: true,
      inspectedResult: {
        packetId: STAGE_1_1.packets[0].id,
        success: false,
        outcome: 'DENY',
        traces: [
          {
            stage: 'IDENTITY_POLICY',
            status: 'DENIED',
            summary: 'No matching Allow statement.',
          },
        ],
      },
    });
    render(<IAMCoachModal />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useGameStore.getState().isCoachModalOpen).toBe(false);
    cleanup();

    // 3. VictoryModal
    useGameStore.setState({ isVictoryModalOpen: true, earnedStars: 3 });
    render(<VictoryModal />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useGameStore.getState().isVictoryModalOpen).toBe(false);
  });

  it('provides switch roles and associated labels in ConfigToggles', () => {
    const onUpdate = vi.fn();
    const { rerender } = render(
      <ConfigToggles
        nodeData={{
          id: 'web-ec2',
          type: 'ec2',
          label: 'Web Server',
          arn: 'arn:aws:iam::111122223333:role/WebRole',
          accountId: '111122223333',
          monthlyCost: 15,
          config: { imdsVersion: 'v2', imdsHopLimit: 1, inPrivateSubnet: true },
          identityPolicies: [],
        }}
        onUpdateConfig={onUpdate}
      />
    );

    const subnetSwitch = screen.getByRole('switch', { name: 'Private Subnet Attachment' });
    expect(subnetSwitch.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(subnetSwitch);
    expect(onUpdate).toHaveBeenCalledWith({ inPrivateSubnet: false });

    expect(screen.getByLabelText('Response Hop Limit')).toBeTruthy();

    rerender(
      <ConfigToggles
        nodeData={{
          id: 'partner-role',
          type: 'iam_role',
          label: 'PartnerRole',
          arn: 'arn:aws:iam::111122223333:role/PartnerRole',
          accountId: '111122223333',
          monthlyCost: 0,
          config: { requireExternalId: '' },
          identityPolicies: [],
        }}
        onUpdateConfig={onUpdate}
      />
    );

    expect(screen.getByLabelText('Required sts:ExternalId')).toBeTruthy();
  });

  it('announces JSON errors in PolicyEditor and warns via toast on template actions', () => {
    freshLevel(STAGE_1_1.id);
    const onChange = vi.fn();
    render(<PolicyEditor title="Identity Policy Document" onChange={onChange} />);

    const editor = screen.getByLabelText('Policy JSON editor');
    fireEvent.change(editor, { target: { value: '{invalid json' } });

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-neo-coral');
    expect(alert.className).toContain('neo-on-accent');

    fireEvent.click(screen.getByRole('button', { name: '+ Allow' }));
    expect(useGameStore.getState().toast?.tone).toBe('warn');
    expect(useGameStore.getState().toast?.message).toMatch(/invalid JSON/i);
  });

  it('renders TopNav icon buttons with accessible names and a single Settings control', () => {
    freshLevel(STAGE_1_1.id);
    render(<TopNav onToggleHints={() => {}} />);

    expect(screen.getByRole('button', { name: 'Hints and debrief' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Switch to (light|dark) mode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Simulation speed:/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /(Mute|Unmute) sound/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Settings' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Start over or export board' })).toBeNull();
  });

  it('scopes VictoryModal Next Stage to the same track and distinguishes Wildcard Admin from Exploit Allowed', () => {
    // Sandbox must show Continue (not Next Stage -> Stage 1.1)
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().setGameMode('Sandbox');
    useGameStore.setState({ isVictoryModalOpen: true, earnedStars: 3 });
    render(<VictoryModal />);
    expect(screen.queryByRole('button', { name: /Next Stage/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    cleanup();

    // Learn final stage (5.3) must also show Continue instead of jumping into Incidents
    const allUnlocked = Object.fromEntries(ALL_LEVELS.map(l => [l.id, 1]));
    freshLevel(STAGE_5_3.id, allUnlocked);
    useGameStore.setState({ isVictoryModalOpen: true, earnedStars: 3 });
    render(<VictoryModal />);
    expect(screen.queryByRole('button', { name: /Next Stage/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    cleanup();

    // Stage 1.1 (no exploits) losing Star 2 due to wildcard admin shows Wildcard Admin (*)
    freshLevel(STAGE_1_1.id);
    useGameStore.setState({
      isVictoryModalOpen: true,
      earnedStars: 1,
      results: [{ packetId: STAGE_1_1.packets[0].id, success: true, outcome: 'ALLOW', traces: [] }],
    });
    render(<VictoryModal />);
    expect(screen.getByText('Wildcard Admin (*)')).toBeTruthy();
    expect(screen.queryByText('Exploit Allowed')).toBeNull();
  });

  it('ignores board keyboard shortcuts while a modal is open', () => {
    freshLevel(STAGE_1_1.id);
    const runSpy = vi.spyOn(useGameStore.getState(), 'runSimulation').mockResolvedValue();
    useGameStore.setState({ isGuideOpen: false, isWelcomeOpen: false, isReportCardOpen: true });

    render(<App />);
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });
    expect(runSpy).not.toHaveBeenCalled();

    act(() => {
      useGameStore.setState({ isReportCardOpen: false, isSettingsOpen: true });
    });
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(runSpy).not.toHaveBeenCalled();

    act(() => {
      useGameStore.setState({ isSettingsOpen: false });
    });
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(runSpy).toHaveBeenCalledTimes(1);
    runSpy.mockRestore();
  });

  it('keeps semantic policy validation errors on Format and blocks invalid template saves in PolicyEditor', () => {
    freshLevel(STAGE_1_1.id);
    const onChange = vi.fn();
    render(<PolicyEditor title="Identity Policy Document" onChange={onChange} />);

    const editor = screen.getByLabelText('Policy JSON editor');
    fireEvent.change(editor, {
      target: { value: '{"Version":"2012-10-17","Statement":[{"Effect":"Nope","Action":"s3:*"}]}' },
    });
    expect(screen.getByRole('alert').textContent).toMatch(/Effect must be "Allow" or "Deny"/);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Format/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/Effect must be "Allow" or "Deny"/);

    fireEvent.click(screen.getByRole('button', { name: '+ Allow' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Effect must be "Allow" or "Deny"/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saves Display name when SettingsModal is dismissed with Escape inside App', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.setState({ isGuideOpen: false, isWelcomeOpen: false, isReportCardOpen: false, isSettingsOpen: true });
    render(<App />);

    const input = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(useGameStore.getState().isSettingsOpen).toBe(false);
    expect(useGameStore.getState().profile.displayName).toBe('Alice');
  });
});
