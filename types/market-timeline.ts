export type MarketEventType =
  | "market_created"
  | "market_opened"
  | "prediction_placed"
  | "odds_updated"
  | "liquidity_added"
  | "market_closed"
  | "dispute_filed"
  | "dispute_resolved"
  | "market_resolved"
  | "payouts_distributed";

export interface MarketEvent {
  id: string;
  eventType: MarketEventType;
  timestamp: Date;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  user?: string;
  relatedEntityId?: string;
  metadata?: Record<string, string>;
}

export interface MarketEventGroup {
  date: string;
  label: string;
  events: MarketEvent[];
}

export const MARKET_EVENT_CONFIG: Record<
  MarketEventType,
  {
    label: string;
    icon: string;
    color: string;
  }
> = {
  market_created: {
    label: "Market Created",
    icon: "plus-circle",
    color: "#8B5CF6",
  },
  market_opened: {
    label: "Market Opened",
    icon: "unlock",
    color: "#06B6D4",
  },
  prediction_placed: {
    label: "Prediction Placed",
    icon: "target",
    color: "#10B981",
  },
  odds_updated: {
    label: "Odds Updated",
    icon: "trending-up",
    color: "#F59E0B",
  },
  liquidity_added: {
    label: "Liquidity Added",
    icon: "droplet",
    color: "#3B82F6",
  },
  market_closed: {
    label: "Market Closed",
    icon: "lock",
    color: "#EF4444",
  },
  dispute_filed: {
    label: "Dispute Filed",
    icon: "alert-circle",
    color: "#F97316",
  },
  dispute_resolved: {
    label: "Dispute Resolved",
    icon: "check-square",
    color: "#10B981",
  },
  market_resolved: {
    label: "Market Resolved",
    icon: "check-circle",
    color: "#22C55E",
  },
  payouts_distributed: {
    label: "Payouts Distributed",
    icon: "gift",
    color: "#8B5CF6",
  },
};

export function getMarketEventIcon(eventType: MarketEventType): string {
  return MARKET_EVENT_CONFIG[eventType]?.icon ?? "circle";
}

export function getMarketEventColor(eventType: MarketEventType): string {
  return MARKET_EVENT_CONFIG[eventType]?.color ?? "#6B7280";
}

export function getMarketEventLabel(eventType: MarketEventType): string {
  return MARKET_EVENT_CONFIG[eventType]?.label ?? eventType;
}
