import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface WarningBannerProps {
  variant?: 'warning' | 'destructive';
  title: string;
  description: string;
}

export function WarningBanner({ variant = 'warning', title, description }: WarningBannerProps) {
  const isWarning = variant === 'warning';

  return (
    <Alert
      variant={isWarning ? 'default' : 'destructive'}
      className={cn(
        isWarning && 'border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-400 [&>svg]:text-amber-500'
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
