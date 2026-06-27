'use client';

import React from 'react';
import { CheckCircle2, Download, ArrowLeft } from 'lucide-react';

interface ReceiptProps {
  receiptId: string;
  amount: string;
  partyA: string;
  partyB?: string;
  timestamp: string;
  type: 'Bet Placement' | 'Claim Submission';
}

export function Receipt({ receiptId, amount, partyA, partyB, timestamp, type }: ReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  // Format date to be cleaner: e.g. "22 AUG, 2025 | 13:29"
  const dateObj = new Date(timestamp);
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();
  const formattedTime = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="receipt-wrapper flex flex-col items-center justify-center w-full min-h-[80vh] print:min-h-0 print:py-12">
      <div className="receipt-container relative w-full max-w-lg bg-card print:bg-white rounded-[24px] print:rounded-none overflow-hidden pb-8 print:pb-0 shadow-sm print:shadow-none border border-border/40 print:border-none">
        
        <div className="hidden print:flex flex-col items-center pt-8 pb-4 w-full text-center">
          <h1 className="text-3xl font-black tracking-tighter text-black">Predictify</h1>
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em] mt-2">Official Record</p>
        </div>

        <div className="flex flex-col items-center text-center pt-12 pb-8 px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6 print:border print:border-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground print:text-black mb-2">
            Success
          </h2>
          <p className="text-muted-foreground print:text-gray-500 text-lg">
            Your {type.toLowerCase()} has been processed.
          </p>
        </div>

        <div className="relative flex items-center justify-center h-12 w-full my-4">
          <div className="absolute -left-6 w-12 h-12 rounded-full bg-background print:bg-white border-r border-border/40 print:border-none print-hide-border z-10"></div>
          <div className="w-[85%] border-t-[3px] border-dashed border-muted print:border-gray-200"></div>
          <div className="absolute -right-6 w-12 h-12 rounded-full bg-background print:bg-white border-l border-border/40 print:border-none print-hide-border z-10"></div>
        </div>

        <div className="px-10 pt-6 pb-4 space-y-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8">
            <div className="flex flex-col space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                Receipt ID
              </span>
              <span className="text-lg font-bold text-foreground print:text-black">
                {receiptId}
              </span>
            </div>
            
            <div className="flex flex-col space-y-1.5 text-right">
              <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                Total Amount
              </span>
              <span className="text-xl font-black text-foreground print:text-black">
                {amount}
              </span>
            </div>

            <div className="flex flex-col space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                Date & Time
              </span>
              <span className="text-base font-semibold text-foreground print:text-black">
                {formattedDate} | {formattedTime}
              </span>
            </div>

            <div className="flex flex-col space-y-1.5 text-right">
              <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                Type
              </span>
              <span className="text-base font-semibold text-foreground print:text-black">
                {type}
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-muted/50 print:border-gray-100">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                  Primary Party
                </span>
                <span className="text-base font-medium text-foreground print:text-black">
                  {partyA}
                </span>
              </div>
              
              {partyB && (
                <div className="flex flex-col space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground print:text-gray-400 uppercase tracking-wider">
                    Counterparty
                  </span>
                  <span className="text-base font-medium text-foreground print:text-black">
                    {partyB}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mt-8 space-y-3 print-hide px-4">
        <button 
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3.5 px-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download Receipt
        </button>
        <button 
          className="w-full flex items-center justify-center gap-2 bg-transparent text-muted-foreground py-3.5 px-4 rounded-xl font-semibold hover:bg-muted/50 transition-colors"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
