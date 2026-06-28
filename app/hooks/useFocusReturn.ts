"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * A hook that tracks the currently focused element and provides a function
 * to restore focus to it later.
 *
 * This is useful for modals, dialogs, and other components that temporarily
 * shift focus away from the triggering element.
 *
 * @returns An object containing:
 *   - `storeTrigger`: A callback to store the current focused element
 *   - `restoreFocus`: A callback to restore focus to the stored element
 *   - `triggerRef`: A ref that can be attached to the trigger element directly
 *
 * @example
 * ```tsx
 * const { storeTrigger, restoreFocus, triggerRef } = useFocusReturn();
 *
 * // Option 1: Store the current focus when opening a modal
 * const handleOpen = () => {
 *   storeTrigger();
 *   setOpen(true);
 * };
 *
 * // Option 2: Attach ref directly to the trigger
 * <button ref={triggerRef} onClick={() => setOpen(true)}>
 *   Open Modal
 * </button>
 *
 * // When modal closes, call restoreFocus()
 * const handleClose = () => {
 *   setOpen(false);
 *   restoreFocus();
 * };
 * ```
 */
export function useFocusReturn() {
  const triggerRef = useRef<HTMLElement | null>(null);
  const storedElement = useRef<HTMLElement | null>(null);

  /**
   * Store the currently focused element.
   * Falls back to the triggerRef if no element is focused.
   */
  const storeTrigger = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;

    if (activeElement && activeElement !== document.body) {
      storedElement.current = activeElement;
    } else if (triggerRef.current) {
      storedElement.current = triggerRef.current;
    }
  }, []);

  /**
   * Restore focus to the stored element.
   * Only restores if the element is still in the DOM and focusable.
   */
  const restoreFocus = useCallback(() => {
    const element = storedElement.current;

    if (element && element.isConnected) {
      // Check if the element is focusable
      const isFocusable =
        element.tabIndex >= 0 ||
        element.tagName === "BUTTON" ||
        element.tagName === "A" ||
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT";

      if (isFocusable) {
        element.focus();
        return true;
      }

      // If not focusable, try to find a focusable child
      const focusableChild = element.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      if (focusableChild) {
        focusableChild.focus();
        return true;
      }

      // Last resort: make the element focusable and focus it
      if (element.tabIndex === -1) {
        element.tabIndex = -1;
        element.focus();
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Store focus on mount if the triggerRef is attached to an element
   * that is currently focused.
   */
  useEffect(() => {
    if (triggerRef.current && document.activeElement === triggerRef.current) {
      storeTrigger();
    }
  }, [storeTrigger]);

  /**
   * Restore focus on unmount as a safety net.
   * This ensures focus is restored even if the component unmounts without
   * explicitly calling restoreFocus.
   */
  useEffect(() => {
    return () => {
      restoreFocus();
    };
  }, [restoreFocus]);

  return {
    storeTrigger,
    restoreFocus,
    triggerRef,
  };
}