"use client";

import { useCallback, useRef, useEffect } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  moveThreshold?: number;
}

interface UseLongPressReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
  role: string;
  "aria-describedby"?: string;
}

/**
 * useLongPress — triggers a callback after a sustained press (default 600 ms).
 *
 * Cancels when the pointer moves beyond `moveThreshold` (default 10 px) or
 * the touch ends / mouse is released before the timer fires.
 *
 * Keyboard: Enter and Space activate `onLongPress` immediately (parity with
 * long-press on touch) so keyboard-only users get the same experience.
 *
 * @example
 * const longPress = useLongPress({ onLongPress: () => setOpen(true) });
 * <button {...longPress}>Hold for help</button>
 */
export function useLongPress({
  onLongPress,
  onClick,
  delay = 600,
  moveThreshold = 10,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
    fired.current = false;
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      clear();
      startPos.current = { x, y };
      fired.current = false;

      timerRef.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, delay);
    },
    [clear, delay, onLongPress]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPos.current || fired.current) return;
      const dx = Math.abs(x - startPos.current.x);
      const dy = Math.abs(y - startPos.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear, moveThreshold]
  );

  const end = useCallback(() => {
    if (fired.current) {
      clear();
      return;
    }
    clear();
    onClick?.();
  }, [clear, onClick]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      move(e.clientX, e.clientY);
    },
    [move]
  );

  const onMouseUp = useCallback(() => {
    end();
  }, [end]);

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      move(touch.clientX, touch.clientY);
    },
    [move]
  );

  const onTouchEnd = useCallback(() => {
    end();
  }, [end]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onLongPress();
      }
    },
    [onLongPress]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onKeyDown,
    tabIndex: 0,
    role: "button",
  };
}
