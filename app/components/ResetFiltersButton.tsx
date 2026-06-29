"use client";

type ResetFiltersButtonProps = {
  onReset: () => void;
  isVisible?: boolean;
};

export function ResetFiltersButton({ onReset, isVisible = true }: ResetFiltersButtonProps) {
  if (!isVisible) return null;

  return (
    <button
      aria-label="Reset all filters"
      className="button button--ghost"
      type="button"
      onClick={onReset}
    >
      Reset filters
    </button>
  );
}
