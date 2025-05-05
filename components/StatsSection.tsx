import React from 'react';
import { UserBalance } from '../types';
import { TrendingUp, DollarSign, Clock } from 'lucide-react';

interface StatsSectionProps {
    balance: UserBalance;
}

const StatsSection: React.FC<StatsSectionProps> = ({ balance }) => {
    console.log('Balance:', balance);
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-700 font-medium">Available Balance</h3>
                    <div className="p-2 bg-gray-100 rounded-full">
                        <DollarSign className="w-5 h-5 text-gray-800" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">${balance?.available.toFixed(2)}</p>
                {balance?.pending > 0 && (
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>${balance.pending.toFixed(2)} pending</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-700 font-medium">Total Winnings</h3>
                    <div className="p-2 bg-gray-100 rounded-full">
                        <TrendingUp className="w-5 h-5 text-gray-800" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">${balance?.totalWinnings.toFixed(2)}</p>
                <div className="mt-2 text-sm text-gray-500">Lifetime earnings</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-700 font-medium">Total Withdrawn</h3>
                    <div className="p-2 bg-gray-100 rounded-full">
                        <DollarSign className="w-5 h-5 text-gray-800" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">${balance?.totalWithdrawn.toFixed(2)}</p>
                <div className="mt-2 text-sm text-gray-500">Lifetime withdrawals</div>
            </div>
        </div>
    );
};

export default StatsSection;