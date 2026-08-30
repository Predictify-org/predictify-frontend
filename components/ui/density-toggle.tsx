"use client";

import React, { useCallback } from "react";
import { useDensity } from "@/hooks/useDensity";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, LayoutList, Table2 } from "lucide-react";

interface DensityToggleProps {
  variant?: "segmented" | "cycle";
  className?: string;
  onDensityChange?: (density: "cozy" | "compact" | "ultra") => void;
}

const densityConfig = {
  cozy: { label: "Cozy", icon: LayoutGrid, description: "Comfortable spacing with full details" },
  compact: { label: "Compact", icon: LayoutList, description: "Reduced spacing, more items visible" },
  ultra: { label: "Ultra", icon: Table2, description: "Maximum density, minimal padding" },
} as const;

export function DensityToggle({ variant = "segmented", className, onDensityChange }: DensityToggleProps) {
  const { density, setDensity } = useDensity();

  const handleChange = useCallback(
    (value: string) => {
      if (value === "cozy" || value === "compact" || value === "ultra") {
        setDensity(value);
        onDensityChange?.(value);
      }
    },
    [setDensity, onDensityChange]
  );

  if (variant === "segmented") {
    return (
      <ToggleGroup
        type="single"
        value={density}
        onValueChange={handleChange}
        className={cn("border rounded-lg p-1 bg-muted", className)}
        aria-label="Card density selector"
      >
        {(Object.keys(densityConfig) as Array<keyof typeof densityConfig>).map((key) => {
          const config = densityConfig[key];
          const Icon = config.icon;
          const isActive = density === key;
          return (
            <ToggleGroupItem
              key={key}
              value={key}
              aria-pressed={isActive}
              aria-label={config.description}
              title={config.description}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{config.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    );
  }

  const currentConfig = densityConfig[density];
  const CurrentIcon = currentConfig.icon;
  return (
    <button
      onClick={() => {
        const next = density === "cozy" ? "compact" : density === "compact" ? "ultra" : "cozy";
        setDensity(next);
      }}
      aria-label={`Current: ${currentConfig.label}. Click to cycle.`}
      className={cn("p-2 rounded-md border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <CurrentIcon className="w-4 h-4" />
    </button>
  );
}

export default DensityToggle;