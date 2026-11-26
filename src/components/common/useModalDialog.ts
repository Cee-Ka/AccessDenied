import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Manages modal dialog keyboard accessibility: moves focus inside on open,
 * traps Tab/Shift+Tab within the dialog, closes the topmost dialog on Escape,
 * and restores focus to the previously focused element on close.
 */
export function useModalDialog(isOpen: boolean, onClose?: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = dialogRef.current;

    const getFocusable = (): HTMLElement[] => {
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      );
    };

    const focusables = getFocusable();
    const initialTarget = focusables[0] ?? container;
    if (initialTarget && typeof initialTarget.focus === 'function') {
      initialTarget.focus();
    }

    const isTopmostDialog = (): boolean => {
      if (!container) return false;
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      return dialogs.length === 0 || dialogs[dialogs.length - 1] === container;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopmostDialog()) return;

      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && container) {
        const items = getFocusable();
        if (items.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  return dialogRef;
}
