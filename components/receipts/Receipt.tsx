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

  return (
    <div className="receipt-container border rounded-lg p-6 max-w-2xl mx-auto bg-card text-card-foreground">
      <div className="flex justify-between items-start mb-6 border-b pb-4 print-hide-border">
        <div>
          <h2 className="text-h2-responsive font-bold">{type} Receipt</h2>
          <p className="text-muted-foreground text-sm mt-1">ID: {receiptId}</p>
        </div>
        <button 
          onClick={handlePrint}
          className="print-hide bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          Save as PDF
        </button>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Date</p>
            <p className="font-medium">{new Date(timestamp).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Amount</p>
            <p className="font-medium text-lg">{amount}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Primary Party</p>
            <p className="font-medium truncate">{partyA}</p>
          </div>
          {partyB && (
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Counterparty</p>
              <p className="font-medium truncate">{partyB}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t border-dashed text-center">
        <p className="text-xs text-muted-foreground">
          This document serves as an official receipt for the {type.toLowerCase()} transaction.
        </p>
      </div>
    </div>
  );
}
