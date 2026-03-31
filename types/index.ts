import type { LucideIcon } from "lucide-react";

export type { ActivityEvent, ActivityEventType, ActivityGroupType, GroupedActivity, ActivityTimelineState } from "./activity";
export { ACTIVITY_GROUPING_RULES, ACTIVITY_GROUP_CONFIG, ACTIVITY_EVENT_ICONS, GROUPING_STRATEGY, DEFAULT_ACTIVITY_TIMEFRAME } from "./activity";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  shadow: string;
}

export interface Step {
  step: string;
  title: string;
  description: string;
  gradient: string;
}

export interface WalletToken {
  name: string;
  icon?: LucideIcon;
  symbol?: string;
  color: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface SocialLink {
  icon: LucideIcon;
  href: string;
}

export interface NavLink {
  href: string;
  label: string;
}
