"use client"
import React, { useState, useMemo } from 'react';
import PredictionCard from './PredictionCard';
import { Prediction, FilterTab, PredictionStatus, Token } from '../types/predictions';

// --- MOCK DATA to match the screenshot ---
const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: '1', title: 'NBA Finals: Lakers vs Heat', description: 'Lakers to win',
    stakeAmount: 10, stakeToken: 'XLM', odds: 1.8, potentialWinnings: 18, winningsToken: 'XLM',
    eventDate: '10/06/2023', status: 'active',
  },
  {
    id: '2', title: 'Presidential Election', description: 'Candidate A wins',
    stakeAmount: 5, stakeToken: 'USDC', odds: 2.2, potentialWinnings: 11, winningsToken: 'USDC',
    eventDate: '15/05/2023', status: 'pending',
  },
  {
    id: '3', title: 'Bitcoin Price June 2023', description: 'Above $30,000',
    stakeAmount: 20, stakeToken: 'XLM', odds: 1.5, potentialWinnings: 30, winningsToken: 'XLM',
    eventDate: '20/04/2023', resolvedDate: '01/06/2023', status: 'won',
  },
  {
    id: '4', title: 'Ethereum Price May 2023', description: 'Above $2,000',
    stakeAmount: 15, stakeToken: 'USDC', odds: 1.7, potentialWinnings: 25.5, winningsToken: 'USDC',
    eventDate: '10/04/2023', resolvedDate: '01/05/2023', status: 'lost',
  },
  {
    id: '5', title: 'Formula 1: Monaco Grand Prix', description: 'Verstappen to win',
    stakeAmount: 8, stakeToken: 'XLM', odds: 1.9, potentialWinnings: 15.2, winningsToken: 'XLM',
    eventDate: '25/05/2023', resolvedDate: '28/05/2023', status: 'won',
  },
];
// --- END MOCK DATA ---

const TABS: FilterTab[] = ['All', 'Active', 'Pending', 'Completed'];

const PredictionsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const filteredPredictions = useMemo(() => {
    if (activeTab === 'All') {
      return MOCK_PREDICTIONS;
    }
    
    // 'Completed' maps to 'won' or 'lost'
    if (activeTab === 'Completed') {
      return MOCK_PREDICTIONS.filter(p => p.status === 'won' || p.status === 'lost');
    }
    
    // 'Active' and 'Pending' map directly to their status
    const status: PredictionStatus = activeTab.toLowerCase() as PredictionStatus;
    return MOCK_PREDICTIONS.filter(p => p.status === status);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-700/50 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition duration-200
              ${activeTab === tab 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPredictions.length > 0 ? (
          filteredPredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))
        ) : (
          <p className="text-gray-400 text-center col-span-full py-10">
            No predictions found for the "{activeTab}" filter.
          </p>
        )}
      </div>
    </div>
  );
};

export default PredictionsList;