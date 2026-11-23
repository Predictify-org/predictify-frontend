"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MOCK_PREDICTIONS } from "./mock-predictions";
import { PredictionCard } from "./PredictionCard";
import type { FilterTab, Prediction, PredictionStatus } from "./types";

interface PredictionsListProps {
  predictions?: Prediction[];
}

const getPredictionsByTab = (
  predictions: Prediction[],
  activeTab: FilterTab
) => {
  if (activeTab === "All") {
    return predictions;
  }

  if (activeTab === "Completed") {
    return predictions.filter((p) => p.status === "won" || p.status === "lost");
  }

  const status: PredictionStatus = activeTab.toLowerCase() as PredictionStatus;
  return predictions.filter((p) => p.status === status);
};

export const PredictionsList: React.FC<PredictionsListProps> = ({
  predictions = MOCK_PREDICTIONS,
}) => {
  const TABS: FilterTab[] = ["All", "Active", "Pending", "Completed"];
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPredictions = useMemo(() => {
    const tabbedPredictions = getPredictionsByTab(predictions, activeTab);
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return tabbedPredictions;
    }

    return tabbedPredictions.filter((prediction) =>
      [prediction.title, prediction.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [activeTab, predictions, searchQuery]);

  const resetFilters = () => {
    setActiveTab("All");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Status Filtering */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 pb-2 md:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
              className={`
                rounded-lg px-4 py-2 text-sm font-medium transition duration-200
                ${
                  activeTab === tab
                    ? "bg-[#6C17B0] text-white border-b-4 border-white"
                    : "text-[#E9D5FF] hover:bg-gray-700 hover:text-white active:bg-gray-600"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <label className="relative block w-full md:max-w-xs">
          <span className="sr-only">Search predictions</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search predictions"
            className="w-full rounded-lg border border-white/20 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-white"
          />
        </label>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredPredictions.length > 0 ? (
          filteredPredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))
        ) : (
          <EmptyState
            title="No predictions match your filters"
            description={
              searchQuery.trim().length > 0
                ? `No predictions match "${searchQuery.trim()}". Reset filters to return to the full predictions list.`
                : `No predictions match the ${activeTab} filter. Reset filters to return to the full predictions list.`
            }
            ctaText="Reset filters"
            onCtaClick={resetFilters}
            className="col-span-full border-white/20 bg-white/10"
          />
        )}
      </div>
    </div>
  );
};
