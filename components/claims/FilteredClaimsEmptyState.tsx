"use client";

import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilteredClaimsEmptyStateProps {
  activeTab: string;
  onReset: () => void;
}

/**
 * Empty state shown when the active claims filter has no matching claims.
 *
 * Lives outside `app/(dashboard)/claims/page.tsx` because Next.js App Router
 * pages may only export the page component and allowed route fields; a named
 * component export fails the production build's page-type check.
 */
export const FilteredClaimsEmptyState: React.FC<FilteredClaimsEmptyStateProps> = ({
  activeTab,
  onReset,
}) => (
  <section
    role="status"
    aria-live="polite"
    className="col-span-full rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center backdrop-blur-sm"
  >
    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
      <TrendingUp size={26} aria-hidden="true" />
    </div>
    <h2 className="text-xl font-semibold text-foreground">
      No claims match this filter
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
      There are no claims with the &quot;{activeTab}&quot; status. Reset filters
      to view all claims.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={onReset}
      className="mt-6"
    >
      Reset filters
    </Button>
  </section>
);
