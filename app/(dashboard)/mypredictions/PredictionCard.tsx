"use client";

import React from "react";
import { Activity, CheckCircle, Clock, XCircle } from "lucide-react";
import type { Prediction, PredictionStatus } from "./types";

export const PredictionCard: React.FC<{ prediction: Prediction }> = ({
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
          <div>
            <p className="text-[#6B7280] text-[15px]">{description}</p>
          </div>
        </div>
        <StatusBadge />
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
        {/* Text colors adjusted for white background */}
        {/* Stake */}
        <div>
          <p className="text-[#6B7280] text-[15px]">Stake</p>
          <p className="text-gray-900 font-medium text-[15px] tabular-nums">
            {stakeAmount} {stakeToken}
          </p>
        </div>

        {/* Odds */}
        <div>
          <p className="text-gray-600 text-[15px]">Odds</p>
          <p className="text-gray-900 font-medium text-[15px] tabular-nums">
            {odds.toFixed(1)}x
          </p>
        </div>

        {/* Potential Winnings */}
        <div>
          <p className="text-[#6B7280] text-[15px]">Potential Winnings</p>
          <p className="text-gray-900 font-medium text-[15px] tabular-nums">
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
            <p className="text-gray-900 font-medium text-[15px]">{resolvedDate}</p>
          </div>
        )}
      </div>
    </div>
  );
};
