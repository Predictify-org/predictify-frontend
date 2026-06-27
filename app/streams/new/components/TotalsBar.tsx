import React from 'react';

interface TotalsBarProps {
  totalAmount?: string;
  tokenSymbol?: string;
  recipientCount?: number;
}

export const TotalsBar: React.FC<TotalsBarProps> = ({
  totalAmount = '0.00',
  tokenSymbol = 'USDC',
  recipientCount = 0,
}) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 w-full border-t border-slate-200 bg-white/80 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row px-4">
        <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-500 dark:text-slate-400">Total Stream Amount:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {totalAmount} {tokenSymbol}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-500 dark:text-slate-400">Recipients:</span>
            <span className="font-bold text-slate-900 dark:text-white">{recipientCount}</span>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 dark:text-slate-500 italic">
          Running Campaign Totals
        </div>
      </div>
    </div>
  );
};

export default TotalsBar;