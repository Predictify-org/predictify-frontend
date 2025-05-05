import React, { useState } from 'react';
import { FilterIcon, X } from 'lucide-react';

interface FilterSectionProps {
    categories: string[];
    onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
    category: string;
    outcome: string;
    dateRange: string;
}

const FilterSection: React.FC<FilterSectionProps> = ({ categories, onFilterChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        category: 'all',
        outcome: 'all',
        dateRange: 'all'
    });

    const handleFilterChange = (filterType: keyof FilterState, value: string) => {
        const newFilters = { ...filters, [filterType]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const resetFilters = {
            category: 'all',
            outcome: 'all',
            dateRange: 'all'
        };
        setFilters(resetFilters);
        onFilterChange(resetFilters);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const hasActiveFilters = () => {
        return filters.category !== 'all' || filters.outcome !== 'all' || filters.dateRange !== 'all';
    };

    return (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-6 overflow-hidden transition-all duration-300">
            <div
                className="px-6 py-4 flex justify-between items-center cursor-pointer"
                onClick={toggleExpand}
            >
                <div className="flex items-center space-x-2">
                    <FilterIcon className="w-5 h-5 text-gray-700" />
                    <h3 className="font-medium text-gray-900">Filters</h3>
                    {hasActiveFilters() && (
                        <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded-full">Active</span>
                    )}
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                    {isExpanded ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <span className="text-sm">
                            {hasActiveFilters() ? 'Edit Filters' : 'Add Filters'}
                        </span>
                    )}
                </button>
            </div>



            {isExpanded && (
                <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sport Category
                        </label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-black focus:border-black"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Outcome
                        </label>
                        <select
                            value={filters.outcome}
                            onChange={(e) => handleFilterChange('outcome', e.target.value)}
                            className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-black focus:border-black"
                        >
                            <option value="all">All Outcomes</option>
                            <option value="win">Wins</option>
                            <option value="loss">Losses</option>
                            <option value="push">Pushes</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Range
                        </label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                            className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-black focus:border-black"
                        >
                            <option value="all">All Time</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="quarter">Last 90 Days</option>
                        </select>
                    </div>

                    <div className="md:col-span-3 flex justify-end mt-2">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default FilterSection;