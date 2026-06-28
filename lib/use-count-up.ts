// lib/use-count-up.ts
import * as React from 'react';

/**
 * Animates a numeric value with requestAnimationFrame while respecting reduced-motion settings.
 * The animation uses the current rendered value as the start point for subsequent updates.
 */
export const useCountUp = (
  endValue: number,
  startValue: number = 0,
  duration: number = 2000
): number => {
  const [currentValue, setCurrentValue] = React.useState(startValue);
  const currentValueRef = React.useRef<number>(startValue);
  const animationRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      setCurrentValue(endValue);
      currentValueRef.current = endValue;
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || duration <= 0) {
      setCurrentValue(endValue);
      currentValueRef.current = endValue;
      return;
    }

    const start = currentValueRef.current;
    const delta = endValue - start;

    if (delta === 0) {
      setCurrentValue(endValue);
      currentValueRef.current = endValue;
      return;
    }

    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = start + delta * eased;

      currentValueRef.current = nextValue;
      setCurrentValue(nextValue);

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(step);
      } else {
        currentValueRef.current = endValue;
        setCurrentValue(endValue);
      }
    };

    animationRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [duration, endValue]);

  return currentValue;
};