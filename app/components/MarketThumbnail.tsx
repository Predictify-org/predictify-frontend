import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils'; // Assuming cn utility is available in the repo

export interface MarketThumbnailProps {
  /** Source URL of the thumbnail image */
  src: string;
  /** Accessible alt text for screen readers */
  alt: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Priority loading (disables lazy loading if true) */
  priority?: boolean;
}

export function MarketThumbnail({
  src,
  alt,
  className,
  width = 80,
  height = 80,
  priority = false,
}: MarketThumbnailProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted border border-border flex items-center justify-center shrink-0',
        className
      )}
      style={{ width, height }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        className="object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}
