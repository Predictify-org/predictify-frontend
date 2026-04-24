// Moderation state vocabulary — extensible for future states
export type ModerationState = 'under_review' | 'paused' | 'restricted' | 'flagged' | 'removed';

export interface ModerationConfig {
  label: string;
  title: string;
  description: string;
  allowedActions: string;
  learnMoreHref: string;
  /** Tailwind classes for banner background + text + border */
  bannerClass: string;
  /** Tailwind classes for badge background + text */
  badgeClass: string;
}
