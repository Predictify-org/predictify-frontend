'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DisputeStateBadge } from '@/components/disputes/DisputeStateBadge';
import { DetailsAccordion } from '@/components/disputes/shared/DetailsAccordion';
import { WarningBanner } from '@/components/disputes/shared/WarningBanner';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import type { DisputeData, DisputeState } from '@/types/disputes';
import '../styles/focus.css';
import '../styles/print.css';

const VALID_STATES: DisputeState[] = ['none', 'open', 'voting', 'ended', 'executed'];

interface DisputeCardProps {
  data: DisputeData;
  onRaiseDispute?: () => void;
  onViewAudit?: (ref: { label: string; url: string }) => void;
  className?: string;
}

function formatDeadline(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DisputeCard({
  data,
  onRaiseDispute,
  onViewAudit,
  className,
}: DisputeCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  // Expand any collapsed audit-ref accordion before printing so the record
  // is complete on paper, then restore whatever the reader had open.
  useEffect(() => {
    const openedByPrint: HTMLButtonElement[] = [];

    const handleBeforePrint = () => {
      const triggers = cardRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [];
      triggers.forEach((trigger) => {
        if (/show details/i.test(trigger.textContent ?? '')) {
          trigger.click();
          openedByPrint.push(trigger);
        }
      });
    };

    const handleAfterPrint = () => {
      openedByPrint.forEach((trigger) => trigger.click());
      openedByPrint.length = 0;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const resolvedState: DisputeState = VALID_STATES.includes(data.state as DisputeState)
    ? (data.state as DisputeState)
    : 'none';

  const stateLabels: Record<DisputeState, string> = {
    none: 'No active dispute',
    open: 'Dispute open — staking',
    voting: 'Community voting',
    ended: 'Voting ended',
    executed: 'Outcome executed',
  };

  return (
    <article
      ref={cardRef}
      className={`dispute-card ${className ?? ''}`}
      data-testid="dispute-card"
      aria-label={`Dispute for ${data.eventTitle}`}
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug">
              {data.eventTitle}
            </CardTitle>
            {data.outcome && (
              <Badge variant="outline" className="w-fit text-xs">
                Outcome: {data.outcome}
              </Badge>
            )}
          </div>
          <DisputeStateBadge state={resolvedState} />
        </CardHeader>

        <CardContent className="space-y-4">
          {data.reason && (
            <p className="text-sm text-muted-foreground">{data.reason}</p>
          )}

          {data.penaltyInfo && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-3 dark:bg-amber-950/20">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{data.penaltyInfo}</p>
            </div>
          )}

          {resolvedState === 'open' && data.stakingDeadline && (
            <p className="text-sm">
              <span className="text-muted-foreground">Staking deadline: </span>
              <time dateTime={data.stakingDeadline.toISOString()} className="font-medium">
                {formatDeadline(data.stakingDeadline)}
              </time>
            </p>
          )}

          {resolvedState === 'voting' && data.votingDeadline && (
            <p className="text-sm">
              <span className="text-muted-foreground">Voting deadline: </span>
              <time dateTime={data.votingDeadline.toISOString()} className="font-medium">
                {formatDeadline(data.votingDeadline)}
              </time>
            </p>
          )}

          {data.tally && (
            <div className="flex gap-4 text-sm">
              {data.tally.map((side) => (
                <span key={side.label} className="text-muted-foreground">
                  {side.label}: <span className="font-medium text-foreground">{side.percentage}%</span>
                </span>
              ))}
            </div>
          )}

          {data.auditRefs && data.auditRefs.length > 0 && (
            <DetailsAccordion>
              <ul className="space-y-2">
                {data.auditRefs.map((ref) => (
                  <li key={ref.url}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                      onClick={(e) => {
                        if (onViewAudit) {
                          e.preventDefault();
                          onViewAudit(ref);
                        }
                      }}
                    >
                      {ref.label}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </DetailsAccordion>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">{stateLabels[resolvedState]}</p>
          {resolvedState === 'none' && onRaiseDispute && (
            <Button
              variant="outline"
              size="sm"
              className="dispute-card-chrome"
              onClick={onRaiseDispute}
              aria-label={`Raise a dispute for ${data.eventTitle}`}
            >
              Raise Dispute
            </Button>
          )}
          {resolvedState === 'ended' && (
            <Button
              variant="ghost"
              size="sm"
              className="dispute-card-chrome"
              asChild
            >
              <a href="#dispute-details" aria-label="View dispute details">
                View Details
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </article>
  );
}
