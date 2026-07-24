import React from 'react';
interface SparklineProps {
  data: number[];
  className?: string;
  'data-testid'?: string;
}
/**
 * Sparkline – a minimalist line chart rendered as an SVG.
 * It receives an array of numeric values and draws a thin line that fills the container width.
 * The component is theme‑aware – it uses stroke-current so the parent can set the colour via Tailwind utilities.
 */
export default function Sparkline({ data, className = '', 'data-testid': testId }: SparklineProps) {
  if (!data || data.length === 0) {
    return null;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`h-4 w-full ${className}`}
      data-testid={testId}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
