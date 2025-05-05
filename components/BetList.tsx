import React from 'react';
import { Bet } from '../types';
import BetCard from './BetCard';
import BetRow from './BetRow';
interface BetListProps {
  bets: Bet[];
  viewMode: 'grid' | 'list';
}

const BetList: React.FC<BetListProps> = ({ bets, viewMode }) => {
  if (bets.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm">
        <p className="text-gray-500">No bets match your filter criteria</p>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bets.map(bet => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odds
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bets.map(bet => (
                  <BetRow key={bet.id} bet={bet} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetList;