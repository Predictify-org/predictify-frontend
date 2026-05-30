export const streamActionCopy = {
  start: {
    label: "Start",
    description: "Start a new payment stream.",
  },
  pause: {
    label: "Pause",
    description: "Pause an active payment stream.",
  },
  stop: {
    label: "Stop",
    description: "Stop a stream that should not continue.",
  },
  settle: {
    label: "Settle",
    description: "Settle the outstanding balance for a stream.",
  },
  withdraw: {
    label: "Withdraw",
    description: "Withdraw available funds from a settled stream.",
  },
} as const;

export const homeCopy = {
  eyebrow: "Payment streaming on Stellar",
  heading: "Manage payment streams with clear, consistent actions.",
  body: "Connect your wallet to start, pause, stop, settle, and withdraw from streams with confidence.",
  primaryCta: "Connect Wallet",
  secondaryCta: "View Stream Actions",
} as const;

/**
 * Hero CTA A/B variants (design-only, Figma handoff)
 *
 * Variant A is the recommended default for v1.
 * See: design/hero-cta-variants/hero-cta-variant-spec.md
 *
 * DO NOT use these in production until a feature-flag issue is created
 * and analytics instrumentation is in place.
 */
export const heroCtaVariants = {
  a: { label: "Connect Stellar wallet", hypothesis: "Naming the network signals trust and specificity for Stellar-native users" },
  b: { label: "Link wallet", hypothesis: "Shorter verb lowers perceived friction for users unfamiliar with Stellar terminology" },
  c: { label: "Get started", hypothesis: "Broadest funnel entry attracts users unsure what wallet means yet" },
} as const;
