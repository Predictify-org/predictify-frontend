// src/components/PredictionCard.tsx
import React from 'react';
import { Prediction, PredictionStatus } from '../types/predictions';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

interface PredictionCardProps {
  prediction: Prediction;
}

// Map status to semantic colors and icons
const statusMap: Record<PredictionStatus, { icon: React.ElementType; label: string; className: string }> = {
  won: { icon: CheckCircle2, label: 'Won', className: 'text-green-600 dark:text-green-500 border-green-600/20 bg-green-50/50 dark:bg-green-500/10' },
  lost: { icon: XCircle, label: 'Lost', className: 'text-red-600 dark:text-red-500 border-red-600/20 bg-red-50/50 dark:bg-red-500/10' },
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-600 dark:text-yellow-500 border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-500/10' },
  active: { icon: Activity, label: 'Active', className: 'text-blue-600 dark:text-blue-500 border-blue-600/20 bg-blue-50/50 dark:bg-blue-500/10' },
};

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const { title, description, stakeAmount, stakeToken, odds, potentialWinnings, winningsToken, eventDate, resolvedDate, status } = prediction;
  const { icon: Icon, className, label } = statusMap[status];

  return (
    <button className="w-full text-left bg-card p-4 rounded-xl shadow-lg hover:bg-muted/50 transition duration-200 cursor-pointer border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-card-foreground line-clamp-2 pr-2">{title}</h3>
        <Badge variant="outline" className={`gap-1.5 shrink-0 ${className}`} aria-label={`Status: ${label}`}>
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm mb-4 truncate-lines-2">{description}</p>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        {/* Stake */}
        <div>
          <p className="text-muted-foreground">Stake</p>
          <p className="text-card-foreground font-medium">{stakeAmount} {stakeToken}</p>
        </div>

        {/* Odds */}
        <div>
          <p className="text-muted-foreground">Odds</p>
          <p className="text-card-foreground font-medium">{odds.toFixed(1)}x</p>
        </div>

        {/* Potential Winnings */}
        <div>
          <p className="text-muted-foreground">Potential Winnings</p>
          <p className="text-card-foreground font-medium">{potentialWinnings} {winningsToken}</p>
        </div>

        {/* Event Date */}
        <div>
          <p className="text-muted-foreground">Event Date</p>
          <p className="text-card-foreground font-medium">{eventDate}</p>
        </div>
        
        {/* Resolved Date (Conditionally rendered) */}
        {(status === 'won' || status === 'lost') && (
          <div className='col-span-2'>
            <p className="text-muted-foreground">Resolved</p>
            <p className="text-card-foreground font-medium">{resolvedDate}</p>
          </div>
        )}
      </div>
    </button>
  );
};

export default PredictionCard;