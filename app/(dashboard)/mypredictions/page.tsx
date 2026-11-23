"use client";
import React, { useState, useMemo } from "react";
// Reverting to standard Lucide-react icons for stability
import { Filter } from "lucide-react";
import { PortfolioPie, STATUS_COLORS } from "@/components/PortfolioPie";
import { MOCK_PREDICTIONS } from "./mock-predictions";
import { PredictionsList } from "./PredictionsList";
import type { MainTab, Prediction } from "./types";

// --- 1. Type Definitions ---

interface Stat {
  title: string;
  value: number;
  color: string; // Tailwind color class
}

// --- 2. Mock Data ---

const MOCK_STATS: Stat[] = [
  { title: "Total Wagered", value: 58.0, color: "bg-white" },
  { title: "Total Won", value: 45.2, color: "bg-white" },
  { title: "Total Lost", value: 15.0, color: "bg-white" },
  { title: "Net Profit", value: 30.2, color: "bg-white" },
];


// --- 3. Sub-Components ---

/**
 * StatBox component for displaying the summary statistics.
 */
const StatBox: React.FC<{ stat: Stat }> = ({ stat }) => {
  const statTextColorMap: Record<string, string> = {
    "Total Wagered": "text-gray-900",
    "Total Won": "text-[#22C55E]",
    "Total Lost": "text-[#EF4444]",
    "Net Profit": "text-[#22C55E]",
  };

  const primaryTextColor = statTextColorMap[stat.title] || "text-gray-900";
  const secondaryTextColor = "text-[#6B7280]";

  return (
    <div
      className={`p-4 rounded-xl shadow-lg bg-white transition duration-200 hover:scale-[1.02] border border-gray-200`}
    >
      {/* Title text color */}
      <p className={`text-[15px] font-medium ${secondaryTextColor}`}>
        {stat.title}
      </p>
      {/* Value text color */}
      <p
        className={`text-[22px] font-bold mt-1 leading-none tabular-nums ${primaryTextColor}`}
      >
        {stat.value.toFixed(2)}
      </p>
    </div>
  );
};


/**
 * Main component handling the entire "My Predictions" and "Transaction History" view.
 */
const MyPredictionsAndHistoryPage: React.FC = () => {
  const MAIN_TABS: MainTab[] = ["My Predictions", "Transaction history"];
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("My Predictions");

  /**
   * Derive portfolio slice data from MOCK_PREDICTIONS.
   * Each slice aggregates stakeAmount for a given status.
   * Replace MOCK_PREDICTIONS with real data when the API is ready.
   */
  const pieData = useMemo(() => {
    const statusOrder: Array<Prediction["status"]> = ["active", "pending", "won", "lost"];
    const labelMap: Record<Prediction["status"], string> = {
      active: "Active",
      pending: "Pending",
      won: "Won",
      lost: "Lost",
    };

    return statusOrder.map((status) => ({
      label: labelMap[status],
      value: MOCK_PREDICTIONS.filter((p) => p.status === status).reduce(
        (sum, p) => sum + p.stakeAmount,
        0
      ),
      color: STATUS_COLORS[labelMap[status]] ?? "#6B7280",
    }));
  }, []);

  const renderContent = () => {
    switch (activeMainTab) {
      case "My Predictions":
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MOCK_STATS.map((stat, index) => (
                <StatBox key={index} stat={stat} />
              ))}
            </div>

            {/* Portfolio distribution pie chart */}
            <PortfolioPie data={pieData} token="XLM" />

            <PredictionsList />
          </div>
        );
      case "Transaction history":
        return (
          <div className="text-center py-20 text-gray-400 text-lg">
            Transaction history coming soon...
            <p className="text-sm mt-2">
              This view would contain a list of all deposits, withdrawals, and
              prediction settlements.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#540D8D] p-4 md:p-8 min-h-screen text-white font-['Inter',sans-serif]">
      <div className="w-full flex justify-between items-center mb-6 border border-[#FFFFFF] p-2 rounded-[6px]">
        <div className="flex space-x-6 flex-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={`
                pb-2 text-lg font-semibold transition duration-200 
                ${
                  activeMainTab === tab
                    ? "text-white border-b-4 border-white bg-[#6C17B0] p-3 rounded-lg"
                    : "text-[#6B7280] hover:text-white border-b-2 border-transparent"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Button (Matching the screenshot placement) */}
        <button className="flex items-center space-x-2 text-white hover:text-purple-300 transition duration-150 p-2 rounded-lg">
          <Filter size={18} />
          <span className="hidden sm:inline text-white">Filter</span>
        </button>
      </div>

      {/* Main Content Area */}
      {renderContent()}
    </div>
  );
};

// Default export is required for the application entry point
export default MyPredictionsAndHistoryPage;
