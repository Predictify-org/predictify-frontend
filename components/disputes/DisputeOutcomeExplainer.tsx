import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TallyBar } from '@/components/disputes/shared/TallyBar';
import { DisputeData } from '@/types/disputes';
import { CheckCircle2, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface DisputeOutcomeExplainerProps {
  data: DisputeData;
  eligibleForAppeal: boolean;
  children?: React.ReactNode;
}

/**
 * DisputeOutcomeExplainer
 * A modal that visualizes the final tally, walks through the payout math step by step,
 * and surfaces an appeal CTA if eligible. Focus is trapped by Radix UI Dialog.
 */
export function DisputeOutcomeExplainer({ data, eligibleForAppeal, children }: DisputeOutcomeExplainerProps) {
  if (!data.tally) return null;

  const [left, right] = data.tally;
  const totalTokens = left.amount + right.amount;
  const leadingOutcome = left.percentage >= right.percentage ? left : right;
  const losingOutcome = left.percentage >= right.percentage ? right : left;

  // Simple participation check logic for visualizer
  const quorumMet = totalTokens > 0; 
  
  // Locale-formatted numbers
  const formattedTotal = new Intl.NumberFormat(navigator.language || 'en-US').format(totalTokens);
  const formattedLosingAmount = new Intl.NumberFormat(navigator.language || 'en-US').format(losingOutcome.amount);
  const formattedLeadingShare = new Intl.NumberFormat(navigator.language || 'en-US', { style: 'percent', maximumFractionDigits: 1 }).format(leadingOutcome.percentage / 100);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || <Button variant="link">How was this decided?</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Outcome Explanation</DialogTitle>
          <DialogDescription>
            A step-by-step breakdown of how the final dispute outcome was calculated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Step 1: Final Tally */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>
              Final Tally
            </h4>
            <div className="pl-7">
              <TallyBar tally={data.tally} showAmounts />
              <p className="text-xs text-muted-foreground mt-2">
                A total of {formattedTotal} tokens were cast.
              </p>
            </div>
          </div>

          {/* Step 2: Quorum Check */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">2</span>
              Quorum Check
            </h4>
            <div className="pl-7 flex items-center gap-2">
              {quorumMet ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Minimum participation reached.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Minimum participation not reached.</span>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Winning Outcome */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">3</span>
              Winning Outcome
            </h4>
            <div className="pl-7">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white border-transparent">
                  {leadingOutcome.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  won with {formattedLeadingShare} of the vote.
                </span>
              </div>
            </div>
          </div>

          {/* Step 4: Payout Calculation */}
          <div className="flex flex-col gap-2" data-testid="payout-calc-step">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">4</span>
              Payout Calculation
            </h4>
            <div className="pl-7">
              <div className="rounded-md bg-muted p-3 text-sm flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p>
                  Winning voters receive their original stake back plus a proportional share of the <strong>{formattedLosingAmount}</strong> tokens staked on <strong>{losingOutcome.label}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center">
          <div className="flex items-center text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mr-1" />
            Decision is final after appeal period.
          </div>
          {eligibleForAppeal && (
            <Button variant="destructive" size="sm">
              Appeal Decision
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
