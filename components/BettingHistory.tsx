"use client";
import React, { useState, useEffect } from 'react';
import { Bet, UserBalance, WithdrawalHistory } from '@/types';
import BetList from '@/components/BetList';
import StatsSection from '@/components/StatsSection';
import FilterSection, { FilterState } from '@/components/FilterSection';
import { CalendarDays, List, LayoutGrid } from 'lucide-react';
import WithdrawalHistorySection from '@/components/WithdrawalHistorySection';
import WithdrawButton from '@/components/WithdrawButton';
interface BettingHistoryProps {
    bets: Bet[];
    userBalance: UserBalance;
    withdrawalHistory: WithdrawalHistory[];
}

const BettingHistory: React.FC<BettingHistoryProps> = ({
    bets,
    userBalance,
    withdrawalHistory
}) => {
    const [filteredBets, setFilteredBets] = useState<Bet[]>(bets);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [balance, setBalance] = useState<UserBalance>(userBalance);
    const [withdrawals, setWithdrawals] = useState<WithdrawalHistory[]>(withdrawalHistory);

    // Get unique categories from bets
    const categories = [...new Set(bets?.map(bet => bet.category))];

    useEffect(() => {
        setFilteredBets(bets);
    }, [bets]);

    const handleWithdraw = (amount: number) => {
        const newWithdrawalId = `w${withdrawals.length + 1}`;
        const today = new Date().toISOString().split('T')[0];

        // Create new withdrawal record
        const newWithdrawal: WithdrawalHistory = {
            id: newWithdrawalId,
            amount,
            date: today,
            status: 'pending'
        };

        // Update withdrawal history
        setWithdrawals([newWithdrawal, ...withdrawals]);

        // Update user balance
        setBalance(prev => ({
            ...prev,
            available: prev.available - amount,
            pending: prev.pending + amount
        }));
    };

    const handleFilterChange = (filters: FilterState) => {
        let result = [...bets];

        // Filter by category
        if (filters.category !== 'all') {
            result = result.filter(bet => bet.category === filters.category);
        }

        // Filter by outcome
        if (filters.outcome !== 'all') {
            result = result.filter(bet => bet.outcome === filters.outcome);
        }

        // Filter by date range
        if (filters.dateRange !== 'all') {
            const today = new Date();
            let daysAgo: number;

            switch (filters.dateRange) {
                case 'week':
                    daysAgo = 7;
                    break;
                case 'month':
                    daysAgo = 30;
                    break;
                case 'quarter':
                    daysAgo = 90;
                    break;
                default:
                    daysAgo = 0;
            }

            if (daysAgo > 0) {
                const cutoffDate = new Date(today.setDate(today.getDate() - daysAgo)).toISOString().split('T')[0];
                result = result.filter(bet => bet.date >= cutoffDate);
            }
        }

        setFilteredBets(result);
    };
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Betting History</h1>
                        <p className="mt-1 text-gray-500">View your past bets and manage your winnings</p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <WithdrawButton
                            availableBalance={balance?.available}
                            onWithdraw={handleWithdraw}
                        />
                    </div>
                </div>

                <StatsSection balance={balance} />
            </header>

            <main className="space-y-8">
                <div>
                    <FilterSection
                        categories={categories}
                        onFilterChange={handleFilterChange}
                    />

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <CalendarDays className="w-5 h-5 mr-2" />
                            Settled Bets
                            {filteredBets?.length > 0 && (
                                <span className="ml-2 text-sm font-medium text-gray-500">({filteredBets.length})</span>
                            )}
                        </h2>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            >
                                <LayoutGrid className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            >
                                <List className="w-5 h-5 text-gray-700" />
                            </button>
                        </div>
                    </div>

                    <BetList bets={filteredBets} viewMode={viewMode} />
                </div>

                <div>
                    <WithdrawalHistorySection withdrawals={withdrawals} />
                </div>
            </main>
        </div>
    );
};

export default BettingHistory;