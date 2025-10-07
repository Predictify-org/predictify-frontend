// lib/use-count-up.ts
import * as React from 'react';

/**
 * Custom hook to animate a number count-up.
 * Uses requestAnimationFrame and IntersectionObserver.
 * @param endValue - The final value to count up to.
 * @param startValue - The starting value (default 0).
 * @param duration - The duration of the animation in milliseconds (default 2000).
 * @returns An array containing the ref and the current animated value.
 */
export const useCountUp = (
  endValue: number,
  startValue: number = 0,
  duration: number = 2000
): [React.RefObject<HTMLDivElement>, number] => {
  const [currentValue, setCurrentValue] = React.useState(startValue);
  const ref = React.useRef<HTMLDivElement>(null);
  const animationRef = React.useRef<number>(0);
  const hasAnimated = React.useRef<boolean>(false);

  React.useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // If reduced motion is preferred, just set the final value instantly
    if (prefersReducedMotion) {
      setCurrentValue(endValue);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // IntersectionObserver to start animation when element is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1); // 0 to 1

            const nextValue = startValue + (endValue - startValue) * percentage;
            setCurrentValue(nextValue);

            if (percentage < 1) {
              animationRef.current = requestAnimationFrame(step);
            }
          };

          animationRef.current = requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the element is visible
    );

    observer.observe(element);

    // Cleanup function
    return () => {
      observer.unobserve(element);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [endValue, startValue, duration]);

  return [ref, currentValue];
};