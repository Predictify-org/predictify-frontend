import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Market } from '@/content/markets.sample';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CompareMarketsModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  marketA: Market | null;
  marketB: Market | null;
}

export function CompareMarketsModal({ isOpen, onClose, marketA, marketB }: CompareMarketsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] w-full bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Compare Markets</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Side-by-side comparison of the selected markets.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Market A */}
          {marketA ? (
            <MarketComparisonColumn market={marketA} />
          ) : (
            <EmptyMarketColumn />
          )}

          {/* Market B */}
          {marketB ? (
            <MarketComparisonColumn market={marketB} />
          ) : (
            <EmptyMarketColumn />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MarketComparisonColumn({ market }: { market: Market }) {
  return (
    <div className="flex flex-col gap-4 p-5 border rounded-xl bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-lg leading-tight">{market.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{market.description}</p>
      </div>
      
      <div className="space-y-3 pt-2">
        <ComparisonRow 
          label="Pool Amount" 
          value={`$${market.poolAmount.toLocaleString()}`} 
        />
        <ComparisonRow 
          label="Yes Odds" 
          value={`${market.yesOdds}%`} 
          valueClass="text-green-500 font-bold"
        />
        <ComparisonRow 
          label="No Odds" 
          value={`${market.noOdds}%`} 
          valueClass="text-red-500 font-bold"
        />
        <ComparisonRow 
          label="Ends In" 
          value={market.endsIn} 
        />
        <div className="flex items-center justify-between py-2 border-b last:border-0 border-border">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <Badge variant={market.status === 'active' ? 'default' : 'secondary'} className="capitalize">
            {market.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyMarketColumn() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed rounded-xl bg-muted/20 text-muted-foreground h-full min-h-[300px]">
      <p className="text-sm">No market selected</p>
    </div>
  );
}

function ComparisonRow({ 
  label, 
  value, 
  valueClass 
}: { 
  label: string; 
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 border-border">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", valueClass)}>{value}</span>
    </div>
  );
}
