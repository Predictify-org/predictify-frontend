"use client";
import React, { useState, useMemo } from "react";
// Reverting to standard Lucide-react icons for stability
import {
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";

// --- 1. Type Definitions ---

type PredictionStatus = "active" | "pending" | "won" | "lost";
type FilterTab = "All" | "Active" | "Pending" | "Completed";
type MainTab = "My Predictions" | "Transaction history";
type Token = "XLM" | "USDC";

interface Prediction {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  stakeToken: Token;
  odds: number;
  potentialWinnings: number;
  winningsToken: Token;
  eventDate: string;
  resolvedDate?: string;
  status: PredictionStatus;
}

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

const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: "1",
    title: "NBA Finals: Lakers vs Heat",
    description: "Lakers to win",
    stakeAmount: 10,
    stakeToken: "XLM",
    odds: 1.8,
    potentialWinnings: 18,
    winningsToken: "XLM",
    eventDate: "10/06/2023",
    status: "active",
  },
  {
    id: "2",
    title: "Presidential Election",
    description: "Candidate A wins",
    stakeAmount: 5,
    stakeToken: "USDC",
    odds: 2.2,
    potentialWinnings: 11,
    winningsToken: "USDC",
    eventDate: "15/05/2023",
    status: "pending",
  },
  {
    id: "3",
    title: "Bitcoin Price June 2023",
    description: "Above $30,000",
    stakeAmount: 20,
    stakeToken: "XLM",
    odds: 1.5,
    potentialWinnings: 30,
    winningsToken: "XLM",
    eventDate: "20/04/2023",
    resolvedDate: "01/06/2023",
    status: "won",
  },
  {
    id: "4",
    title: "Ethereum Price May 2023",
    description: "Above $2,000",
    stakeAmount: 15,
    stakeToken: "USDC",
    odds: 1.7,
    potentialWinnings: 25.5,
    winningsToken: "USDC",
    eventDate: "10/04/2023",
    resolvedDate: "01/05/2023",
    status: "lost",
  },
  {
    id: "5",
    title: "Formula 1: Monaco Grand Prix",
    description: "Verstappen to win",
    stakeAmount: 8,
    stakeToken: "XLM",
    odds: 1.9,
    potentialWinnings: 15.2,
    winningsToken: "XLM",
    eventDate: "25/05/2023",
    resolvedDate: "28/05/2023",
    status: "won",
  },
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
        className={`text-[22px] font-bold mt-1 leading-none ${primaryTextColor}`}
      >
        {stat.value.toFixed(2)}
      </p>
    </div>
  );
};

/**
 * PredictionCard component for a single prediction entry.
 */
const PredictionCard: React.FC<{ prediction: Prediction }> = ({
  prediction,
}) => {
  const {
    title,
    description,
    stakeAmount,
    stakeToken,
    odds,
    potentialWinnings,
    winningsToken,
    eventDate,
    resolvedDate,
    status,
  } = prediction;

  // Map status to Tailwind colors and badge labels
  const statusMap: Record<
    PredictionStatus,
    { color: string; label: string; Icon: any }
  > = {
    // Using Lucide icons and colors for the light card background
    won: { color: "bg-[#DCFCE7]", label: "Won", Icon: CheckCircle },
    lost: { color: "bg-[#FEE2E2]", label: "Lost", Icon: XCircle },
    pending: { color: "bg-[#FEF9C3]", label: "Pending", Icon: Clock }, // Using Clock icon for pending
    active: { color: "bg-[#DBEAFE]", label: "Active", Icon: Activity },
  };

  const { color, label, Icon } = statusMap[status];

  // Map icon color explicitly for the light badge background
  const iconColorMap = {
    won: "text-[#22C55E]",
    lost: "text-[#EF4444]",
    pending: "text-[#EAB308]",
    active: "text-[#3B82F6]",
  };

  const StatusBadge = () => (
    <span
      className={`flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded-full bg-opacity-90 ${color}`}
      // Removed text-gray-900 from here to let the inner span define the text color
    >
      {/* Icons use specific colors on the light background */}
      <span className="text-lg leading-none" aria-label={label}>
        <Icon size={12} className={iconColorMap[status]} />
      </span>
      {/* Applied the status color to the label text */}
      <span className={`hidden sm:inline ${iconColorMap[status]}`}>
        {label}
      </span>
    </span>
  );

  return (
    // Card background changed to white, hover changed to subtle gray
    <div className="bg-white flex flex-col justify- p-4 sm:min-w-[519px] min-w-full min-h-[252px] rounded-xl shadow-xl hover:bg-gray-50 transition duration-200 cursor-pointer border border-[#E5E7EB] space-y-3">
      <div className="flex justify-between items-start border-b border-[#F3F4F6] pb-4">
        <div className="flex-1 pr-2">
          <h3 className="text-[17px] font-semibold text-[#111827] truncate">
            {title}
          </h3>
          div
          <div>
            <p className="text-[#6B7280] text-[15px]">{description}</p>
          </div>
        </div>
        <StatusBadge />
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
        <div>
          <p className="text-[#6B7280] text-[15px]">Stake</p>
          <p className="text-gray-900 font-medium text-[15px]">
            {stakeAmount} {stakeToken}
          </p>
        </div>

        <div>
          <p className="text-gray-600 text-[15px]">Odds</p>
          <p className="text-gray-900 font-medium text-[15px]">
            {odds.toFixed(1)}x
          </p>
        </div>

        <div>
          <p className="text-[#6B7280] text-[15px]">Potential Winnings</p>
          <p className="text-gray-900 font-medium text-[15px]">
            {potentialWinnings} {winningsToken}
          </p>
        </div>

        {/* Event Date */}
        <div>
          <p className="text-[#6B7280] text-[15px]">Event Date</p>
          <p className="text-gray-900 font-medium text-[15px]">{eventDate}</p>
        </div>

        {/* Resolved Date (Conditionally rendered) */}
        {(status === "won" || status === "lost") && resolvedDate && (
          <div className="col-span-2">
            <p className="text-[#6B7280] text-[15px] mt-1">Resolved Date</p>
            <p className="text-gray-900 font-medium text-[15px]">
              {resolvedDate}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


const PredictionsList: React.FC = () => {
  const TABS: FilterTab[] = ["All", "Active", "Pending", "Completed"];
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const filteredPredictions = useMemo(() => {
    if (activeTab === "All") {
      return MOCK_PREDICTIONS;
    }

    if (activeTab === "Completed") {
      return MOCK_PREDICTIONS.filter(
        (p) => p.status === "won" || p.status === "lost"
      );
    }

    const status: PredictionStatus =
      activeTab.toLowerCase() as PredictionStatus;
    return MOCK_PREDICTIONS.filter((p) => p.status === status);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Status Filtering */}
      <div className="flex space-x-2 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition duration-200
              ${
                activeTab === tab
                  ? "bg-[#6C17B0] text-white border-b-4 border-white p-3 rounded-lg"
                  : "text-[#6B7280] hover:bg-gray-700 hover:text-white active:bg-gray-600"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredPredictions.length > 0 ? (
          filteredPredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))
        ) : (
          <p className="text-gray-400 text-center col-span-full py-10 text-lg">
            No predictions found for the "{activeTab}" status.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Main component handling the entire "My Predictions" and "Transaction History" view.
 */
const MyPredictionsAndHistoryPage: React.FC = () => {
  const MAIN_TABS: MainTab[] = ["My Predictions", "Transaction history"];
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("My Predictions");

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
