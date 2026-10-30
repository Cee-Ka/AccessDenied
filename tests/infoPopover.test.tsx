// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InfoPopover } from '../src/components/common/InfoPopover';

afterEach(cleanup);

describe('InfoPopover', () => {
  it('opens from its trigger and shows the glossary entry', () => {
    render(<InfoPopover conceptId="permission_boundary" />);
    fireEvent.click(screen.getByRole('button', { name: /What is Permission Boundary/ }));

    const dialog = screen.getByRole('dialog', { name: 'Permission Boundary' });
    expect(dialog.textContent).toMatch(/ceiling/);
  });

  it('closes on Escape, returns focus, and does not leak Escape to the app', () => {
    const appEscape = vi.fn();
    window.addEventListener('keydown', appEscape);
    render(<InfoPopover conceptId="scp" />);
    const trigger = screen.getByRole('button', { name: /What is Service Control Policy/ });

    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(appEscape).not.toHaveBeenCalled();
    window.removeEventListener('keydown', appEscape);
  });

  it('closes on an outside click', () => {
    render(
      <div>
        <InfoPopover conceptId="scp" />
        <p>outside</p>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /What is/ }));
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders content without any network access', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<InfoPopover conceptId="vpc_endpoint" variant="chip" />);
    fireEvent.click(screen.getByRole('button', { name: /VPC Endpoint/ }));
    expect(screen.getByRole('dialog').textContent).toMatch(/Gateway endpoints/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
