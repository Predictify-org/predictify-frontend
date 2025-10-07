// src/components/PredictionCard.tsx
import React from 'react';
import { Prediction, PredictionStatus } from '../types/predictions';

interface PredictionCardProps {
  prediction: Prediction;
}

// Map status to Tailwind colors and badge labels
const statusMap: Record<PredictionStatus, { color: string; label: string }> = {
  won: { color: 'bg-green-500', label: 'Won 🟢' },
  lost: { color: 'bg-red-500', label: 'Lost 🔴' },
  pending: { color: 'bg-yellow-500', label: 'Pending 🟡' },
  active: { color: 'bg-blue-500', label: 'Active 🔵' },
};

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const { title, description, stakeAmount, stakeToken, odds, potentialWinnings, winningsToken, eventDate, resolvedDate, status } = prediction;
  const { color, label } = statusMap[status];

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-lg hover:bg-gray-700 transition duration-200 cursor-pointer border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className={`px-3 py-1 text-sm font-medium rounded-full text-white ${color}`}>
          {label}
        </span>
      </div>

      <p className="text-gray-400 text-sm mb-4">{description}</p>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        {/* Stake */}
        <div>
          <p className="text-gray-400">Stake</p>
          <p className="text-white font-medium">{stakeAmount} {stakeToken}</p>
        </div>

        {/* Odds */}
        <div>
          <p className="text-gray-400">Odds</p>
          <p className="text-white font-medium">{odds.toFixed(1)}x</p>
        </div>

        {/* Potential Winnings */}
        <div>
          <p className="text-gray-400">Potential Winnings</p>
          <p className="text-white font-medium">{potentialWinnings} {winningsToken}</p>
        </div>

        {/* Event Date */}
        <div>
          <p className="text-gray-400">Event Date</p>
          <p className="text-white font-medium">{eventDate}</p>
        </div>
        
        {/* Resolved Date (Conditionally rendered) */}
        {(status === 'won' || status === 'lost') && (
          <div className='col-span-2'>
            <p className="text-gray-400">Resolved</p>
            <p className="text-white font-medium">{resolvedDate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard;