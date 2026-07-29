import * as React from "react";
import { LiveRegion } from "../components/LiveRegion";

export type StreamStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "reconnecting"
  | "error";

export interface StreamPanelProps {
  status: StreamStatus;
  label?: string;
}

const STATUS_MESSAGES: Record<StreamStatus, string> = {
  connected: "Stream connected",
  connecting: "Stream connecting",
  disconnected: "Stream disconnected",
  reconnecting: "Stream reconnecting",
  error: "Stream error",
};

const STATUS_COLORS: Record<StreamStatus, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  disconnected: "bg-gray-400",
  reconnecting: "bg-blue-500",
  error: "bg-red-500",
};

function formatLabel(status: StreamStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function StreamPanel({ status, label }: StreamPanelProps) {
  return (
    <div className="stream-panel flex items-center gap-3 rounded-lg border p-4 shadow-sm">
      <span
        className={`inline-block h-3 w-3 rounded-full ${STATUS_COLORS[status]}`}
        aria-hidden="true"
      />
      <span className="text-sm font-medium">
        {label ?? formatLabel(status)}
      </span>
      <LiveRegion message={STATUS_MESSAGES[status]} />
    </div>
  );
}

export default StreamPanel;
