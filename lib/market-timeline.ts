import {
  MarketEvent,
  MarketEventType,
} from "@/types/market-timeline";

export function generateMockMarketEvents(eventTitle?: string): MarketEvent[] {
  const now = new Date();
  const title = eventTitle ?? "Super Bowl Winner 2025";

  const events: MarketEvent[] = [
    {
      id: "mt-1",
      eventType: "market_created",
      timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      title: `"${title}" market created`,
      description: "Market was created by the platform administrator",
      user: "admin",
    },
    {
      id: "mt-2",
      eventType: "market_opened",
      timestamp: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      title: `"${title}" opened for predictions`,
      description: "Market is now accepting predictions from all users",
    },
    {
      id: "mt-3",
      eventType: "liquidity_added",
      timestamp: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000 + 3600000),
      title: `Liquidity added to "${title}"`,
      description: "Initial liquidity pool funded with 10,000 USDC",
      amount: 10000,
      currency: "USDC",
      user: "0x1a2b...3c4d",
    },
    {
      id: "mt-4",
      eventType: "prediction_placed",
      timestamp: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      title: "Prediction placed on Kansas City Chiefs",
      description: "User predicted Kansas City Chiefs would win",
      amount: 500,
      currency: "USDC",
      user: "0x5e6f...7g8h",
    },
    {
      id: "mt-5",
      eventType: "prediction_placed",
      timestamp: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      title: "Prediction placed on San Francisco 49ers",
      description: "User predicted San Francisco 49ers would win",
      amount: 350,
      currency: "USDC",
      user: "0x9i0j...1k2l",
    },
    {
      id: "mt-6",
      eventType: "odds_updated",
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      title: "Odds updated for Kansas City Chiefs",
      description: "Odds moved from 2.5x to 2.2x following increased volume",
      metadata: {
        before: "2.5x",
        after: "2.2x",
      },
    },
    {
      id: "mt-7",
      eventType: "prediction_placed",
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      title: "Prediction placed on Detroit Lions",
      description: "User predicted Detroit Lions would win",
      amount: 1000,
      currency: "USDC",
      user: "0x3m4n...5o6p",
    },
    {
      id: "mt-8",
      eventType: "odds_updated",
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      title: "Odds updated for Detroit Lions",
      description: "Odds moved from 5.0x to 4.5x following a large prediction",
      metadata: {
        before: "5.0x",
        after: "4.5x",
      },
    },
    {
      id: "mt-9",
      eventType: "prediction_placed",
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      title: "Prediction placed on Kansas City Chiefs",
      description: "User predicted Kansas City Chiefs would win",
      amount: 750,
      currency: "USDC",
      user: "0x7q8r...9s0t",
    },
    {
      id: "mt-10",
      eventType: "dispute_filed",
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      title: "Dispute filed on market resolution",
      description: "User challenged the oracle source used for resolution",
      user: "0x1u2v...3w4x",
    },
    {
      id: "mt-11",
      eventType: "dispute_resolved",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      title: "Dispute resolved in favor of original outcome",
      description: "Review confirmed the oracle data was accurate",
    },
    {
      id: "mt-12",
      eventType: "market_closed",
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      title: `"${title}" closed for new predictions`,
      description: "The betting window has ended. No further predictions accepted.",
    },
    {
      id: "mt-13",
      eventType: "market_resolved",
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      title: `"${title}" resolved`,
      description: "Market resolved with outcome: Kansas City Chiefs",
    },
    {
      id: "mt-14",
      eventType: "payouts_distributed",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      title: `Payouts distributed for "${title}"`,
      description: "All winning predictions have been paid out automatically",
      amount: 8750,
      currency: "USDC",
    },
  ];

  return events;
}

export function formatMarketTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diff / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "Just now";
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatMarketTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function groupMarketEventsByDate(
  events: MarketEvent[]
): { date: string; label: string; events: MarketEvent[] }[] {
  const sorted = [...events].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const groups = new Map<string, MarketEvent[]>();

  sorted.forEach((event) => {
    const now = new Date();
    const eventDate = event.timestamp;
    const diff = now.getTime() - eventDate.getTime();
    const diffInDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    let key: string;
    let label: string;

    if (diffInDays === 0) {
      key = "today";
      label = "Today";
    } else if (diffInDays === 1) {
      key = "yesterday";
      label = "Yesterday";
    } else if (diffInDays < 7) {
      key = "this-week";
      label = "This Week";
    } else if (diffInDays < 30) {
      key = "this-month";
      label = "This Month";
    } else {
      const month = eventDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      key = month;
      label = month;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(event);
  });

  const order = ["today", "yesterday", "this-week", "this-month"];
  const result: { date: string; label: string; events: MarketEvent[] }[] = [];

  order.forEach((key) => {
    if (groups.has(key)) {
      result.push({ date: key, label: key === "this-month" ? "This Month" : key === "this-week" ? "This Week" : key === "today" ? "Today" : "Yesterday", events: groups.get(key)! });
      groups.delete(key);
    }
  });

  groups.forEach((events, key) => {
    result.push({ date: key, label: key, events });
  });

  return result;
}
