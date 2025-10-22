import { useEffect, useRef } from 'react';

/**
 * Hook to trap focus within an element (for modals and dialogs)
 * @param isActive - Whether the focus trap is active
 * @returns A ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const elementRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Save the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element within the container
    const firstFocusable = elementRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;

    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Handle Tab key to trap focus within the container
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = elementRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      // Shift + Tab: moving backwards
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab: moving forwards
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Cleanup: restore previous focus
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return elementRef;
}
