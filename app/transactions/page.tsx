import React from 'react';
import EmptyState from '@/app/components/EmptyState';

export default function TransactionsPage() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8 dark:text-gray-100">
        Transactions
      </h1>
      
      <EmptyState
        illustration={
          <svg
            className="w-48 h-48 mx-auto text-indigo-200 dark:text-indigo-900/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        }
        title="No transactions found"
        description="Looks like you haven't made any transactions yet. Start trading to see your history here."
        ctaLabel="Explore Markets"
        ctaHref="/markets"
        className="mt-6"
      />
    </div>
  );
}
