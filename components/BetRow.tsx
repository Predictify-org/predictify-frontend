import React from 'react';
import { Bet } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BetRowProps {
    bet: Bet;
}

const BetRow: React.FC<BetRowProps> = ({ bet }) => {
    const getOutcomeIcon = () => {
        switch (bet.outcome) {
            case 'win':
                return <TrendingUp className="w-4 h-4 text-black" />;
            case 'loss':
                return <TrendingDown className="w-4 h-4 text-gray-500" />;
            case 'push':
                return <Minus className="w-4 h-4 text-gray-700" />;
            default:
                return null;
        }
    };

    const getOutcomeClass = () => {
        switch (bet.outcome) {
            case 'win':
                return 'text-black font-medium';
            case 'loss':
                return 'text-gray-500';
            case 'push':
                return 'text-gray-700';
            default:
                return '';
        }
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {bet.eventName}
                        </div>
                        <div className="text-sm text-gray-500">
                            {bet.category}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                    {new Date(bet.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                    ${bet.betAmount.toFixed(2)}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">

                <div className="text-sm text-gray-900">
                    {bet.odds.toFixed(2)}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className={`text-sm ${getOutcomeClass()} flex items-center`}>
                    {getOutcomeIcon()}
                    <span className="ml-1 capitalize">{bet.outcome}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {bet.outcome === 'win' ? (
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            ${bet.payout.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                            Fee: -${bet.fees.toFixed(2)}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">
                        ${bet.payout.toFixed(2)}
                    </div>
                )}
            </td>
        </tr>
    );
};

export default BetRow;