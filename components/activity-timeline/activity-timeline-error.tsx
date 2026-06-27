import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ActivityTimelineError({ 
  error, 
  className, 
  onRetry 
}: { 
  error: string; 
  className?: string; 
  onRetry: () => void 
}) {
  return (
    <div className={`p-4 border border-red-200 bg-red-50 rounded-lg text-center ${className || ''}`}>
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <h3 className="font-semibold text-red-700">Error Loading Activities</h3>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      <Button variant="outline" onClick={onRetry} className="border-red-200 text-red-700 hover:bg-red-100">
        Retry
      </Button>
    </div>
  );
}
