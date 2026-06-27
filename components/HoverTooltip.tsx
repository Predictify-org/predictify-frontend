import React, { useState, useRef, useEffect, ReactNode } from 'react';

/**
 * HoverTooltip – shows tooltip content after a short hover delay (default 300ms).
 * On touch devices it appears after a long‑press (default 600ms).
 *
 * The component is fully accessible:
 *  - The child receives `aria-describedby` pointing to the tooltip id.
 *  - The tooltip is rendered with `role="tooltip"`.
 *  - Keyboard navigation works via focus/blur events.
 *
 * Design follows the app's dark‑mode token palette and uses a subtle glass‑morphism
 * background to stay consistent with the premium UI aesthetic.
 */
interface HoverTooltipProps {
  /** Tooltip content (plain text or JSX) */
  content: ReactNode;
  /** Children that trigger the tooltip */
  children: ReactNode;
  /** Delay before showing tooltip on hover (ms) */
  hoverDelay?: number;
  /** Duration of press before showing tooltip on touch (ms) */
  pressDelay?: number;
  /** Optional className for the wrapper element */
  className?: string;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  content,
  children,
  hoverDelay = 300,
  pressDelay = 600,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef(`hover-tooltip-${Math.random().toString(36).substr(2, 9)}`);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, []);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(show, hoverDelay);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hide();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only treat primary button / touch as long‑press
    if (e.button !== 0) return;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(show, pressDelay);
  };
  const handlePointerUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    hide();
  };
  const handlePointerLeave = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    hide();
  };

  const handleFocus = () => show();
  const handleBlur = () => hide();

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={tooltipId.current}
    >
      {children}
      {visible && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className="absolute z-10 w-max max-w-xs px-3 py-2 text-sm text-white bg-white/10 backdrop-blur-lg rounded-lg shadow-lg whitespace-pre-line transition-opacity duration-200"
          style={{ top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)' }}
        >
          {content}
        </div>
      )}
    </span>
  );
};
