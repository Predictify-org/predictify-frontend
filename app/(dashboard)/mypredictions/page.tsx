"use client"
import React, { useState, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';

// --- 1. Type Definitions ---

type PredictionStatus = 'active' | 'pending' | 'won' | 'lost';
type FilterTab = 'All' | 'Active' | 'Pending' | 'Completed';
type MainTab = 'My Predictions' | 'Transaction history';
type Token = 'XLM' | 'USDC';

interface Prediction {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  stakeToken: Token;
  odds: number;
  potentialWinnings: number;
  winningsToken: Token;
  eventDate: string; // MM/DD/YYYY
  resolvedDate?: string; // MM/DD/YYYY - Only for 'won' or 'lost'
  status: PredictionStatus;
}

interface Stat {
  title: string;
  value: number;
  color: string; // Tailwind color class
}

// --- 2. Mock Data (Matching the Screenshot) ---

const MOCK_STATS: Stat[] = [
  { title: 'Total Wagered', value: 58.00, color: 'bg-gray-700/80' },
  { title: 'Total Won', value: 45.20, color: 'bg-green-600/70' },
  { title: 'Total Lost', value: 15.00, color: 'bg-red-600/70' },
  { title: 'Net Profit', value: 30.20, color: 'bg-purple-600' },
];

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

// --- 3. Sub-Components ---

/**
 * StatBox component for displaying the summary statistics.
 */
const StatBox: React.FC<{ stat: Stat }> = ({ stat }) => (
  <div className={`p-4 rounded-xl shadow-lg ${stat.color} text-white transition duration-200 hover:scale-[1.02]`}>
    <p className="text-sm font-medium opacity-80">{stat.title}</p>
    <p className="text-3xl font-bold mt-1 leading-none">{stat.value.toFixed(2)}</p>
  </div>
);

/**
 * PredictionCard component for a single prediction entry.
 */
const PredictionCard: React.FC<{ prediction: Prediction }> = ({ prediction }) => {
  const { title, description, stakeAmount, stakeToken, odds, potentialWinnings, winningsToken, eventDate, resolvedDate, status } = prediction;

  // Map status to Tailwind colors and badge labels (using the screenshot's style)
  const statusMap: Record<PredictionStatus, { color: string; label: string }> = {
    won: { color: 'bg-green-500/80', label: 'Won' },
    lost: { color: 'bg-red-500/80', label: 'Lost' },
    pending: { color: 'bg-yellow-500/80', label: 'Pending' },
    active: { color: 'bg-blue-500/80', label: 'Active' },
  };
  
  const { color, label } = statusMap[status];
  
  // Helper to determine the status icon (simplified from the screenshot)
  const StatusBadge = () => (
    <span className={`flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded-full text-white bg-opacity-90 ${color}`}>
        {/* Simplified Icons matching screenshot style */}
        <span className="text-lg leading-none" role="img" aria-label={label}>
            {status === 'won' && '✅'}
            {status === 'lost' && '❌'}
            {status === 'pending' && '⏳'}
            {status === 'active' && '⏰'}
        </span>
        <span className='hidden sm:inline'>{label}</span>
    </span>
  );

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-xl hover:bg-gray-700 transition duration-200 cursor-pointer border border-gray-700/50 space-y-3">
      <div className="flex justify-between items-start">
        <div className='flex-1 pr-2'>
            <h3 className="text-base font-semibold text-white truncate">{title}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{description}</p>
        </div>
        <StatusBadge />
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
        {/* Stake */}
        <div>
          <p className="text-gray-400 text-xs">Stake</p>
          <p className="text-white font-medium text-sm">{stakeAmount} {stakeToken}</p>
        </div>

        {/* Odds */}
        <div>
          <p className="text-gray-400 text-xs">Odds</p>
          <p className="text-white font-medium text-sm">{odds.toFixed(1)}x</p>
        </div>

        {/* Potential Winnings */}
        <div>
          <p className="text-gray-400 text-xs">Potential Winnings</p>
          <p className="text-white font-medium text-sm">{potentialWinnings} {winningsToken}</p>
        </div>

        {/* Event Date */}
        <div>
          <p className="text-gray-400 text-xs">Event Date</p>
          <p className="text-white font-medium text-sm">{eventDate}</p>
        </div>
        
        {/* Resolved Date (Conditionally rendered) */}
        {(status === 'won' || status === 'lost') && resolvedDate && (
          <div className='col-span-2'>
            <p className="text-gray-400 text-xs mt-1">Resolved Date</p>
            <p className="text-white font-medium text-sm">{resolvedDate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * PredictionsList component handles the internal filtering and rendering of cards.
 */
const PredictionsList: React.FC = () => {
  const TABS: FilterTab[] = ['All', 'Active', 'Pending', 'Completed'];
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const filteredPredictions = useMemo(() => {
    if (activeTab === 'All') {
      return MOCK_PREDICTIONS;
    }
    
    if (activeTab === 'Completed') {
      return MOCK_PREDICTIONS.filter(p => p.status === 'won' || p.status === 'lost');
    }
    
    const status: PredictionStatus = activeTab.toLowerCase() as PredictionStatus;
    return MOCK_PREDICTIONS.filter(p => p.status === status);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Status Filtering */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPredictions.length > 0 ? (
          filteredPredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))
        ) : (
          <p className="text-gray-400 text-center col-span-full py-10 text-lg">
            No predictions found for the "{activeTab}" status.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Main component handling the entire "My Predictions" and "Transaction History" view.
 */
const MyPredictionsAndHistoryPage: React.FC = () => {
  const MAIN_TABS: MainTab[] = ['My Predictions', 'Transaction history'];
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('My Predictions');

  const renderContent = () => {
    switch (activeMainTab) {
      case 'My Predictions':
        return (
          <div className="space-y-8">
            {/* Stats Section (Total Wagered, etc.) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MOCK_STATS.map((stat, index) => (
                <StatBox key={index} stat={stat} />
              ))}
            </div>

            {/* Predictions List (with inner tabs) */}
            <PredictionsList />
          </div>
        );
      case 'Transaction history':
        return (
          <div className="text-center py-20 text-gray-400 text-lg">
            Transaction history coming soon...
            <p className='text-sm mt-2'>This view would contain a list of all deposits, withdrawals, and prediction settlements.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // Mimics the main content area of the dashboard
    <div className="bg-[#540D8D] p-4 md:p-8 min-h-screen text-white font-['Inter',sans-serif]">
      
      {/* Header Bar: Main Tabs and Filter Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-6 border-b-2 border-gray-700/50 flex-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={`
                pb-2 text-lg font-semibold transition duration-200 
                ${activeMainTab === tab 
                  ? 'text-white border-b-2 border-purple-500' 
                  : 'text-gray-400 hover:text-white border-b-2 border-transparent'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Filter Button (Matching the screenshot placement) */}
        <button className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition duration-150 p-2 rounded-lg bg-gray-800/50">
          <Filter size={18} />
          <span className='hidden sm:inline'>Filter</span>
        </button>
      </div>

      {/* Main Content Area */}
      {renderContent()}

    </div>
  );
};

// Default export is required for the application entry point
export default MyPredictionsAndHistoryPage;
