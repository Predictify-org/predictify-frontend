'use client';

import React from 'react';

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

  const isBet = type === 'Bet Placement';

  return (
    <div className="relative border border-border shadow-2xl rounded-2xl max-w-2xl mx-auto bg-card text-card-foreground overflow-hidden print:shadow-none print:border-none print:rounded-none">
      
      {/* Decorative Top Accent */}
      <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 print:bg-black"></div>

      <div className="p-8 sm:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary print:border print:border-black">
              {isBet ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              )}
            </div>
            <div>
              <h2 className="text-h2-responsive font-bold tracking-tight">{type}</h2>
              <p className="text-caption text-muted-foreground uppercase tracking-widest mt-1">Official Receipt</p>
            </div>
          </div>
          
          <button 
            onClick={handlePrint}
            className="print-hide bg-primary text-primary-foreground font-medium px-5 py-2.5 rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            Save as PDF
          </button>
        </div>

        {/* Amount & Status Section */}
        <div className="bg-secondary/30 rounded-xl p-6 mb-8 border border-border/50 print:border-black print:bg-white print:border-2">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <p className="text-label text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-stat-lg font-bold text-foreground">{amount}</p>
            </div>
            <div className="hidden sm:block h-12 w-px bg-border print:bg-black"></div>
            <div>
              <p className="text-label text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 print:border-black print:text-black print:bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-caption font-bold">Confirmed</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Transaction Details */}
        <div className="space-y-6 relative">
          <h3 className="text-h4 font-semibold border-b pb-2 print:border-black">Transaction Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Transaction ID</p>
              <p className="text-body-md font-mono text-foreground break-all">{receiptId}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Date & Time</p>
              <p className="text-body-md font-medium text-foreground">{new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}</p>
            </div>
            
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Primary Party</p>
              <p className="text-body-md font-medium text-foreground truncate">{partyA}</p>
            </div>
            
            {partyB && (
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Counterparty</p>
                <p className="text-body-md font-medium text-foreground truncate">{partyB}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Decorative Tear-line */}
        <div className="mt-10 pt-8 border-t-[3px] border-dashed border-border print:border-black relative">
          {/* Decorative cutouts */}
          <div className="absolute -top-4 -left-10 sm:-left-12 w-8 h-8 bg-background rounded-full print:hidden"></div>
          <div className="absolute -top-4 -right-10 sm:-right-12 w-8 h-8 bg-background rounded-full print:hidden"></div>
          
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Fake Barcode */}
            <div className="flex gap-1 h-12 w-48 opacity-60 print:opacity-100 mix-blend-multiply print:mix-blend-normal">
              {[...Array(24)].map((_, i) => (
                <div key={i} className={`h-full bg-foreground print:bg-black`} style={{ width: `${Math.random() * 4 + 1}px`, opacity: Math.random() > 0.3 ? 1 : 0 }}></div>
              ))}
            </div>
            <p className="text-caption text-muted-foreground text-center">
              This document serves as an official proof of {type.toLowerCase()}.<br/>
              Keep this receipt for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
