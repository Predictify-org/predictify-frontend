import type { Stat } from "@/types/index";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StatCardProps {
  stat?: Stat;
  index: number;
  /**
   * Determines which UI variant to display.
   * - "loading": shows a skeleton placeholder.
   * - "empty": shows an empty state with an illustration and CTA.
   * - "error": shows an error alert with a retry button.
   */
  status?: "loading" | "empty" | "error";
  /** Callback invoked when the retry button is clicked in error state */
  onRetry?: () => void;
}

export function StatCard({ stat, index, status, onRetry }: StatCardProps) {
  if (status === "loading") {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No data available.</p>
        <p className="text-sm text-muted-foreground mb-4">Create events to generate statistics.</p>
        <Button asChild>
          <Link href="/events/new">Create New Event</Link>
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Failed to load KPI</AlertTitle>
        <AlertDescription>
          An error occurred while fetching the data.
        </AlertDescription>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        )}
      </Alert>
    );
  }

  // Normal success state – render the stat card UI
  return (
    <div className="relative group">
      <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">
          {stat?.value}
        </div>
        <div className="text-slate-400 font-medium text-sm sm:text-base">
          {stat?.label}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
    </div>
  );
}
