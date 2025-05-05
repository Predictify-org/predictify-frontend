import React from 'react';
import { Bet } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BetCardProps {
    bet: Bet;
}

const BetCard: React.FC<BetCardProps> = ({ bet }) => {
    const getOutcomeIcon = () => {
        switch (bet.outcome) {
            case 'win':
                return <TrendingUp className="w-5 h-5 text-white" />;
            case 'loss':
                return <TrendingDown className="w-5 h-5 text-white" />;
            case 'push':
                return <Minus className="w-5 h-5 text-white" />;
            default:
                return null;
        }
    };

    const getOutcomeColor = () => {
        switch (bet.outcome) {
            case 'win':
                return 'bg-gray-900';
            case 'loss':
                return 'bg-gray-600';
            case 'push':
                return 'bg-gray-700';
            default:
                return 'bg-gray-800';
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
            <div className="flex flex-col h-full">
                <div className={`${getOutcomeColor()} px-4 py-2 flex justify-between items-center`}>
                    <span className="text-white font-medium">{bet.category}</span>
                    <div className="flex items-center space-x-1">
                        {getOutcomeIcon()}
                        <span className="text-white font-medium capitalize">{bet.outcome}</span>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-2">{bet.eventName}</h3>

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Bet Amount</span>
                        <span className="font-medium text-gray-900">${bet.betAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Odds</span>
                        <span className="font-medium text-gray-900">{bet.odds.toFixed(2)}</span>
                    </div>

                    {bet.outcome === 'win' && (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-sm">Payout</span>
                                <span className="font-medium text-gray-900">${bet.payout.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Platform Fee</span>
                                <span className="font-medium text-gray-900">-${bet.fees.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                <span className="text-gray-800 font-medium">Net Winnings</span>
                                <span className="font-bold text-gray-900">${(bet.payout - bet.fees).toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BetCard;