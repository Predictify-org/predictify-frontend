import { useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, X } from 'lucide-react';
import { TransactionFilters } from '@/lib/types';
import { allTransactions } from '@/lib/mock-data';


export default function TransactionHistory() {
    const [activeTab, setActiveTab] = useState('transaction');
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState<TransactionFilters>({
        type: [],
        status: [],
        currency: [],
        dateFrom: '',
        dateTo: ''
    });



    const parseDate = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };

    const filteredTransactions = allTransactions.filter(transaction => {
        // Filter by type
        if (filters.type.length > 0 && !filters.type.includes(transaction.type)) {
            return false;
        }

        // Filter by status
        if (filters.status.length > 0 && !filters.status.includes(transaction.status)) {
            return false;
        }

        // Filter by currency
        if (filters.currency.length > 0 && !filters.currency.includes(transaction.currency)) {
            return false;
        }

        // Filter by date range
        if (filters.dateFrom) {
            const transactionDate = parseDate(transaction.date);
            const fromDate = new Date(filters.dateFrom);
            if (transactionDate < fromDate) {
                return false;
            }
        }

        if (filters.dateTo) {
            const transactionDate = parseDate(transaction.date);
            const toDate = new Date(filters.dateTo);
            if (transactionDate > toDate) {
                return false;
            }
        }

        return true;
    });

    const handleFilterChange = <K extends keyof TransactionFilters>(
        category: K,
        value: TransactionFilters[K] extends Array<infer U> ? U : TransactionFilters[K]
    ) => {
        setFilters(prev => {
            const currentValues = prev[category];
            if (Array.isArray(currentValues)) {
                //@ts-ignore
                if (currentValues.includes(value as any)) {
                    return {
                        ...prev,
                        [category]: currentValues.filter((v: any) => v !== value)
                    };
                } else {
                    return {
                        ...prev,
                        [category]: [...currentValues, value]
                    };
                }
            } else {
                return {
                    ...prev,
                    [category]: value
                };
            }
        });
    };

    const clearFilters = () => {
        setFilters({
            type: [],
            status: [],
            currency: [],
            dateFrom: '',
            dateTo: ''
        });
    };

    const hasActiveFilters = filters.type.length > 0 ||
        filters.status.length > 0 ||
        filters.currency.length > 0 ||
        filters.dateFrom ||
        filters.dateTo;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-2">
            <div className="max-w-[97%] mx-auto">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('predictions')}
                        className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'predictions'
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-800 text-purple-300 hover:bg-purple-700'
                            }`}
                    >
                        My Predictions
                    </button>
                    <button
                        onClick={() => setActiveTab('transaction')}
                        className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'transaction'
                            ? 'bg-white text-purple-900'
                            : 'bg-purple-800 text-purple-300 hover:bg-purple-700'
                            }`}
                    >
                        Transaction history
                    </button>
                    <div className="ml-auto flex items-center">
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`${showFilter ? 'bg-purple-600' : 'bg-purple-700'} hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filter
                            {hasActiveFilters && (
                                <span className="bg-white text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                    {filters.type.length + filters.status.length + filters.currency.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
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
                                onClick={() => setShowFilter(false)}
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
                                    {(['deposit', 'bet', 'win', 'withdraw', 'refund'] as const).map(type => (
                                        <label key={type} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.type.includes(type)}
                                                onChange={() => handleFilterChange('type', type)}
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
                                    {(['completed', 'pending'] as const).map(status => (
                                        <label key={status} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.status.includes(status)}
                                                onChange={() => handleFilterChange('status', status)}
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
                                    {(['XLM', 'USDC'] as const).map(currency => (
                                        <label key={currency} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.currency.includes(currency)}
                                                onChange={() => handleFilterChange('currency', currency)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">{currency}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="From"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="To"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowFilter(false)}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Wagered</div>
                        <div className="text-2xl font-bold text-gray-900">58.00</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Won</div>
                        <div className="text-2xl font-bold text-green-500">45.20</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Total Lost</div>
                        <div className="text-2xl font-bold text-red-500">15.00</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-gray-500 text-xs font-medium mb-1">Net Profit</div>
                        <div className="text-2xl font-bold text-green-500">30.20</div>
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="bg-white rounded-lg overflow-hidden shadow-lg mt-9">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-sm">No transactions match your filters</p>
                            <button
                                onClick={clearFilters}
                                className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full px-4">
                                <thead className='bg-[#F9FAFB] h-14'>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-gray-600 font-medium text-sm">Date</th>
                                        <th className="text-left py-3 px-4 text-gray-600 font-medium text-sm">Type</th>
                                        <th className="text-left py-3 px-4 text-gray-600 font-medium text-sm">Amount</th>
                                        <th className="text-left py-3 px-4 text-gray-600 font-medium text-sm">Status</th>
                                        <th className="text-left py-3 px-4 text-gray-600 font-medium text-sm">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((transaction, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4 text-sm text-gray-500">{transaction.date}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {transaction.icon === 'down' && (
                                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                                            <ArrowDown className="w-3 h-3 text-green-600" />
                                                        </div>
                                                    )}
                                                    {transaction.icon === 'up' && (
                                                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                                            <ArrowUp className="w-3 h-3 text-red-600" />
                                                        </div>
                                                    )}
                                                    {transaction.icon === 'refresh' && (
                                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <RefreshCw className="w-3 h-3 text-blue-600" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-gray-900 font-medium">{transaction.type}</span>
                                                </div>
                                            </td>
                                            <td className={`py-4 px-4 text-sm font-semibold ${transaction.amountColor}`}>
                                                {transaction.amount}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-block w-24 text-center px-4 py-2 rounded-full text-xs font-medium ${transaction.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-500">{transaction.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}