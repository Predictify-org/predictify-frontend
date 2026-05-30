interface ThrottleEvent {
  route: string;
  limitType: string;
  timestamp: string;
  identityType: string;
  identityDisplay: string;
}

const throttledCounters = new Map<string, number>();
const totalCounters = new Map<string, number>();
const recentThrottles: ThrottleEvent[] = [];
const MAX_RECENT_THROTTLES = 100;

export function recordThrottle(
  route: string,
  limitType: string,
  identityType: string,
  identityDisplay: string
): void {
  const key = `${route}:${limitType}`;
  throttledCounters.set(key, (throttledCounters.get(key) || 0) + 1);

  const event: ThrottleEvent = {
    route,
    limitType,
    timestamp: new Date().toISOString(),
    identityType,
    identityDisplay,
  };
  recentThrottles.push(event);
  if (recentThrottles.length > MAX_RECENT_THROTTLES) {
    recentThrottles.shift();
  }

  console.warn(
    JSON.stringify({
      event: "rate_limit_throttled",
      route,
      limitType,
      timestamp: event.timestamp,
      identityType,
      identityDisplay,
    })
  );
}

export function recordRequest(route: string): void {
  totalCounters.set(route, (totalCounters.get(route) || 0) + 1);
}

export function getMetrics(): {
  throttled: Record<string, number>;
  total: Record<string, number>;
  recentThrottles: ThrottleEvent[];
} {
  return {
    throttled: Object.fromEntries(throttledCounters),
    total: Object.fromEntries(totalCounters),
    recentThrottles: [...recentThrottles],
  };
}

export function resetMetrics(): void {
  throttledCounters.clear();
  totalCounters.clear();
  recentThrottles.length = 0;
}
