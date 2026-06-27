import React from 'react';
import { Receipt } from '@/components/receipts';

export default function TestReceiptPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="print-hide space-y-2 mb-8 border-b pb-4">
        <h1 className="text-h1-responsive font-bold">Receipt Testing Ground</h1>
        <p className="text-body-lg text-muted-foreground">
          This is a temporary page to test the Receipt component and print layout. 
          When you click "Save as PDF", everything outside the receipt box should hide automatically.
        </p>
      </div>

      <div className="bg-muted p-8 rounded-xl">
        <Receipt 
          receiptId="TXN-98237498234-XYZ"
          amount="$1,450.00"
          partyA="0x1234...5678 (You)"
          partyB="Predictify Market Pool"
          timestamp={new Date().toISOString()}
          type="Bet Placement"
        />
      </div>
    </div>
  );
}
