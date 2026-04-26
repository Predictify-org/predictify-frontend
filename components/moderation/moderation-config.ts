import type { ModerationConfig, ModerationState } from '@/types/moderation';

export const MODERATION_CONFIG: Record<ModerationState, ModerationConfig> = {
  under_review: {
    label: 'Under Review',
    title: 'This market is currently under review.',
    description: 'Our team is verifying this market to ensure it meets community guidelines.',
    allowedActions: 'Trading remains available during this review.',
    learnMoreHref: '/help/moderation#under-review',
    bannerClass:
      'border-amber-400/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-300 [&>svg]:text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  },
  paused: {
    label: 'Paused',
    title: 'This market is temporarily paused.',
    description: 'Activity on this market has been suspended while we investigate a reported issue.',
    allowedActions: 'New actions are temporarily disabled. Existing positions are unaffected.',
    learnMoreHref: '/help/moderation#paused',
    bannerClass:
      'border-orange-400/50 bg-orange-50 text-orange-900 dark:bg-orange-950/20 dark:text-orange-300 [&>svg]:text-orange-500',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  },
  restricted: {
    label: 'Restricted',
    title: 'This market has restricted access.',
    description: 'Participation in this market is limited to eligible users based on regional or compliance rules.',
    allowedActions: 'View-only access is available. Trading may be unavailable in your region.',
    learnMoreHref: '/help/moderation#restricted',
    bannerClass:
      'border-slate-400/50 bg-slate-50 text-slate-900 dark:bg-slate-950/20 dark:text-slate-300 [&>svg]:text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300',
  },
  flagged: {
    label: 'Flagged',
    title: 'This market has been flagged for review.',
    description: 'Community members have raised concerns about this market. Our team is investigating.',
    allowedActions: 'Trading is paused until the review is complete.',
    learnMoreHref: '/help/moderation#flagged',
    bannerClass:
      'border-red-400/50 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-300 [&>svg]:text-red-500',
    badgeClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  },
  removed: {
    label: 'Removed',
    title: 'This market has been removed.',
    description: 'This market was found to violate community guidelines and has been permanently closed.',
    allowedActions: 'No further actions are available on this market.',
    learnMoreHref: '/help/moderation#removed',
    bannerClass:
      'border-red-600/50 bg-red-100 text-red-950 dark:bg-red-950/30 dark:text-red-200 [&>svg]:text-red-600',
    badgeClass: 'bg-red-200 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-200',
  },
};
