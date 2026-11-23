'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import type { TransactionFilters } from '@/lib/types';
import { Timestamp } from '@/components/ui/Timestamp';
import { CopyableText } from '@/components/ui/CopyableText';
import { DatePicker } from '@/app/components/DatePicker';
import { useWallet } from '@/hooks/useWallet.hook';
import { useAccountOperations } from '@/hooks/useAccountOperations';
import { ExportMenu } from '@/components/export/ExportMenu';
import type { ExportColumn } from '@/lib/export/csv';
import { usePrivacy } from '@/context/PrivacyContext';

interface TransactionExportRow {
    date: string;
    hash: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
}

const transactionExportColumns: ExportColumn<TransactionExportRow>[] = [
    { key: 'date', label: 'Date' },
    { key: 'hash', label: 'Hash' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
];

/** yyyy-MM-dd, matching the format previously produced by <input type="date">. */
const FILTER_DATE_FORMAT = 'yyyy-MM-dd';

export type ArrayFilterKey = 'type' | 'status' | 'currency';

export function toggleFilterValue<K extends ArrayFilterKey>(
    filters: TransactionFilters,
    category: K,
    value: TransactionFilters[K][number]
): TransactionFilters {
    const currentValues = filters[category] as ReadonlyArray<TransactionFilters[K][number]>;
    const exists = currentValues.includes(value);
    const nextValues = exists
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

    return {
        ...filters,
        [category]: nextValues,
    };
}

function parseTransactionDate(dateStr: string): Date {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
}

/** Converts a 'yyyy-MM-dd' filter string (or '') into a Date | null for the DatePicker. */
function filterStringToDate(value: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, (month ?? 1) - 1, day ?? 1);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function TransactionsHistory() {
    const { isConnected, walletAddress, connectWallet, isConnecting } = useWallet();
    const { hideBalances } = usePrivacy();
    const {
        operations,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        retry,
    } = useAccountOperations(isConnected ? walletAddress : null);

    const [activeTab, setActiveTab] = useState<'predictions' | 'transaction'>('transaction');
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState<TransactionFilters>({
        type: [],
        status: [],
        currency: [],
        dateFrom: '',
        dateTo: '',
    });

    const activeState = 'bg-[#6C17B0] text-white font-bold rounded-sm border-b-[2.6px] border-white';

    const filteredTransactions = useMemo(() => {
        return operations.filter((transaction) => {
            if (filters.type.length > 0 && !filters.type.includes(transaction.type)) {
                return false;
            }

            if (filters.status.length > 0 && !filters.status.includes(transaction.status)) {
                return false;
            }

            if (filters.currency.length > 0 && !filters.currency.includes(transaction.currency)) {
                return false;
            }

            if (filters.dateFrom) {
                const transactionDate = parseTransactionDate(transaction.date);
                const fromDate = new Date(`${filters.dateFrom}T00:00:00.000Z`);
                if (transactionDate < fromDate) {
                    return false;
                }
            }

            if (filters.dateTo) {
                const transactionDate = parseTransactionDate(transaction.date);
                const toDate = new Date(`${filters.dateTo}T23:59:59.999Z`);
                if (transactionDate > toDate) {
                    return false;
                }
            }

            return true;
        });
    }, [filters, operations]);

    const exportRows = useMemo(
        () =>
            filteredTransactions.map((transaction) => ({
                date: transaction.date,
                hash: transaction.hash,
                type: transaction.type,
                amount: transaction.amount.startsWith('-')
                    ? -transaction.numericAmount
                    : transaction.numericAmount,
                currency: transaction.currency,
                status: transaction.status,
                description: transaction.description,
            })),
        [filteredTransactions]
    );

    const stats = useMemo(() => {
        let totalWagered = 0;
        let totalWon = 0;
        let totalLost = 0;

        for (const op of operations) {
            if (op.type === 'bet') {
                totalWagered += op.numericAmount;
            } else if (op.type === 'win') {
                totalWon += op.numericAmount;
            } else if (op.type === 'withdraw') {
                totalLost += op.numericAmount;
            }
        }

        const netProfit = totalWon - totalWagered;

        return {
            totalWagered: totalWagered.toFixed(2),
            totalWon: totalWon.toFixed(2),
            totalLost: totalLost.toFixed(2),
            netProfit: netProfit.toFixed(2),
        };
    }, [operations]);

    const handleFilterToggle = <K extends ArrayFilterKey>(
        category: K,
        value: TransactionFilters[K][number]
    ) => {
        setFilters((prev) => toggleFilterValue(prev, category, value));
    };

    const clearFilters = () => {
        setFilters({
            type: [],
            status: [],
            currency: [],
            dateFrom: '',
            dateTo: '',
        });
    };

    const activeFilterCount =
        filters.type.length +
        filters.status.length +
        filters.currency.length +
        (filters.dateFrom ? 1 : 0) +
        (filters.dateTo ? 1 : 0);

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#540d8d] via-purple-800 to-purple-900 p-2">
            <div className="max-w-[97%] mx-auto">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border p-2 border-white rounded-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab('predictions')}
                        className={`px-6 rounded-t-lg text-[19.43px] font-medium transition-colors ${activeTab === 'predictions'
                            ? activeState
                            : 'text-[#6B7280] hover:bg-purple-950'
                            }`}
                    >
                        My Predictions
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('transaction')}
                        className={`px-6 rounded-t-lg text-[19.43px] font-medium transition-colors ${activeTab === 'transaction'
                            ? activeState
                            : 'text-[#6B7280] hover:bg-purple-950'
                            }`}
                    >
                        Transaction history
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <ExportMenu
                            rows={exportRows}
                            columns={transactionExportColumns}
                            filename="predictify-transactions"
                            hideBalances={hideBalances}
                            sensitiveColumns={['amount']}
                        />
                        <button
                            type="button"
                            onClick={() => setShowFilter((prev) => !prev)}
                            className={`${showFilter ? 'bg-purple-600' : 'bg-transparent'} hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filter
                            {hasActiveFilters && (
                                <span className="bg-white text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilter && (
                    <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Filter Transactions</h3>
                            <button
                                type="button"
                                onClick={() => setShowFilter(false)}
                                aria-label="Close filters"
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                                <div className="space-y-2">
                                    {(['deposit', 'bet', 'win', 'withdraw', 'refund'] as const).map((type) => (
                                        <label key={type} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.type.includes(type)}
                                                onChange={() => handleFilterToggle('type', type)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <div className="space-y-2">
                                    {(['completed', 'pending'] as const).map((status) => (
                                        <label key={status} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.status.includes(status)}
                                                onChange={() => handleFilterToggle('status', status)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Currency Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                <div className="space-y-2">
                                    {(['XLM', 'USDC'] as const).map((currency) => (
                                        <label key={currency} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.currency.includes(currency)}
                                                onChange={() => handleFilterToggle('currency', currency)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">{currency}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <DatePicker
                                    mode="range"
                                    label="Date range"
                                    fromLabel="From"
                                    toLabel="To"
                                    dateFormat={FILTER_DATE_FORMAT}
                                    value={{
                                        from: filterStringToDate(filters.dateFrom) ?? undefined,
                                        to: filterStringToDate(filters.dateTo) ?? undefined,
                                    }}
                                    onChange={(range) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            dateFrom: range?.from ? format(range.from, FILTER_DATE_FORMAT) : '',
                                            dateTo: range?.to ? format(range.to, FILTER_DATE_FORMAT) : '',
                                        }));
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowFilter(false)}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-5 mb-6">
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Wagered</div>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalWagered}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Won</div>
                        <div className="text-2xl font-bold text-green-500">{stats.totalWon}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Lost</div>
                        <div className="text-2xl font-bold text-red-500">{stats.totalLost}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Net Profit</div>
                        <div className="text-2xl font-bold text-green-500">{stats.netProfit}</div>
                    </div>
                </div>

                {/* Transaction Table / States */}
                <div className="bg-white rounded-lg overflow-hidden shadow-lg mt-9">
                    {!isConnected || !walletAddress ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-gray-900 text-base font-semibold">
                                Connect your wallet to view transactions
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                Connect a Stellar wallet to load your on-chain account operations.
                            </p>
                            <button
                                type="button"
                                onClick={() => void connectWallet('freighter')}
                                disabled={isConnecting}
                                className="mt-4 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg transition-colors"
                            >
                                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        </div>
                    ) : isLoading && operations.length === 0 ? (
                        <div className="text-center py-12 px-4" role="status" aria-live="polite">
                            <p className="text-gray-600 text-sm font-medium">Loading transactions...</p>
                        </div>
                    ) : error && operations.length === 0 ? (
                        <div className="text-center py-12 px-4" role="alert">
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                            <button
                                type="button"
                                onClick={retry}
                                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : operations.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-gray-900 text-base font-semibold">No transactions yet</p>
                            <p className="text-gray-500 text-sm mt-1">
                                This account has no on-chain operations yet. Fund your wallet or place a prediction to see activity here.
                            </p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-gray-500 text-sm">No transactions match your filters</p>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full px-4">
                                    <thead className="bg-[#F9FAFB] h-16">
                                        <tr className="border-b h-[61px] box-border border-gray-200">
                                            <th className="text-left h-[61px] py-3 px-8 text-gray-600 font-medium text-sm">Date</th>
                                            <th className="text-left h-[61px] py-3 px-8 text-gray-600 font-medium text-sm">Hash</th>
                                            <th className="text-left h-[61px] py-4 px-8 w-[179px] text-gray-600 font-medium text-sm">Type</th>
                                            <th className="text-left max-h-[61px] py-4 px-8 w-[159px] text-gray-600 font-medium text-sm">Amount</th>
                                            <th className="text-left max-h-[61px] py-6 px-8 w-[164px] text-gray-600 font-medium text-sm">Status</th>
                                            <th className="text-left max-h-[61px] py-6 px-8 text-gray-600 font-medium text-sm">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map((transaction) => (
                                            <tr
                                                key={transaction.id}
                                                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="h-[94px] max-h-[91px] py-8 px-8 text-sm text-gray-500">
                                                    <Timestamp date={transaction.date} />
                                                </td>
                                                <td className="py-8 px-8">
                                                    <CopyableText text={transaction.hash} visibleChars={6} />
                                                </td>
                                                <td className="py-8 px-8">
                                                    <div className="flex items-center gap-2">
                                                        {transaction.icon === 'down' && (
                                                            <ArrowDown className="w-4 h-4 text-green-600" />
                                                        )}
                                                        {transaction.icon === 'up' && (
                                                            <ArrowUp className="w-4 h-4 text-red-600" />
                                                        )}
                                                        {transaction.icon === 'refresh' && (
                                                            <RefreshCw fontWeight={900} className="w-3 h-3 text-blue-600 font-extrabold" />
                                                        )}
                                                        <span className="text-sm text-gray-900 font-medium capitalize">{transaction.type}</span>
                                                    </div>
                                                </td>
                                                <td className={`text-sm py-8 px-8 font-semibold tabular-nums ${transaction.amountColor}`}>
                                                    {transaction.amount}
                                                </td>
                                                <td className="py-8 px-8">
                                                    <span
                                                        className={`inline-block w-24 text-center py-2 rounded-full text-xs font-medium ${transaction.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                            }`}
                                                    >
                                                        {transaction.status}
                                                    </span>
                                                </td>
                                                <td className="py-8 px-8 text-sm text-gray-500">{transaction.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {error && (
                                <div className="flex items-center justify-center gap-3 py-4 px-4 border-t border-gray-200 bg-red-50" role="alert">
                                    <span className="text-red-600 text-sm">{error}</span>
                                    <button
                                        type="button"
                                        onClick={retry}
                                        className="text-sm font-medium text-purple-700 hover:text-purple-800 underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {hasMore && (
                                <div className="flex justify-center py-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => void loadMore()}
                                        disabled={isLoadingMore}
                                        className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg transition-colors"
                                    >
                                        {isLoadingMore ? 'Loading more...' : 'Load more'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TransactionsHistory;
