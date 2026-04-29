export type ChecklistAnswer = "yes" | "no" | "na" | null;

export type ChecklistItem = {
  id: string;
  item: string;
  /** Optional annotation shown below the item text */
  annotation?: string;
};

export type ChecklistSection = {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
};

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "a11y",
    title: "Accessibility (a11y)",
    description: "All 8 items must pass before handoff. Document any phase-2 gaps with a ticket reference.",
    items: [
      {
        id: "a11y-1",
        item: "All text meets WCAG AA contrast — 4.5:1 for body text, 3:1 for large text and UI components. Verified with a contrast tool (Stark, Colour Contrast Analyser, or Figma A11y Kit).",
      },
      {
        id: "a11y-2",
        item: "Every interactive element (button, link, input, badge) has a visible focus ring designed and annotated — not just the browser default.",
      },
      {
        id: "a11y-3",
        item: "Colour is never the sole means of conveying status. Each StatusBadge (draft / active / paused / ended) uses both colour and a text label.",
      },
      {
        id: "a11y-4",
        item: "Touch and click targets are ≥ 44 × 44 px for all interactive controls (stream row actions, modal close button, CTA buttons).",
      },
      {
        id: "a11y-5",
        item: "Reading and focus order is annotated in Figma dev mode for every screen and matches the intended DOM / tab order.",
      },
      {
        id: "a11y-6",
        item: "All icons used without adjacent visible text have an aria-label annotation (e.g. Modal close button, status icons).",
      },
      {
        id: "a11y-7",
        item: "Motion / animation: a reduced-motion variant is noted for every entrance or exit animation (e.g. Modal scale-in / fade-in).",
      },
      {
        id: "a11y-8",
        item: "Any phase-2 a11y gaps (e.g. live-region announcements for stream status changes) are documented with rationale and a ticket reference.",
      },
    ],
  },
  {
    id: "money-actions",
    title: "Irreversible Money Actions",
    description:
      "Applies to Settle, Withdraw, and Stop — and any future Soroban / escrow release action. These actions cannot be undone on-chain.",
    items: [
      {
        id: "money-1",
        item: "A confirmation step (modal or inline) is designed for every irreversible action (Settle, Withdraw, Stop). The confirmation copy names the action, amount, and recipient explicitly.",
      },
      {
        id: "money-2",
        item: "Destructive / irreversible actions use a visually distinct treatment (e.g. warning colour, separate button style) — not the same style as reversible actions (Pause, Start).",
      },
      {
        id: "money-3",
        item: 'The confirmation modal for Settle / Withdraw / Stop includes a plain-language warning: "This action cannot be undone." Copy is reviewed and approved by product.',
      },
      {
        id: "money-4",
        item: "Amount and recipient are shown in the confirmation step so the user can verify before submitting — no hidden values.",
      },
      {
        id: "money-5",
        item: 'Loading / pending state is designed for the post-confirmation submit (on-chain tx in flight): button disabled, spinner or skeleton shown, copy updated (e.g. "Settling…").',
      },
      {
        id: "money-6",
        item: "Success and error outcomes are both designed for every irreversible action — not just the happy path. Error copy is non-committal about chain state where the Horizon / Soroban API is not yet final.",
      },
    ],
  },
  {
    id: "interactive-states",
    title: "All Interactive States",
    items: [
      {
        id: "states-1",
        item: "Every button has all five states designed: default, hover, focus, active / pressed, disabled.",
      },
      {
        id: "states-2",
        item: "Every form input (if present) has: default, focus, filled, error, and disabled states.",
      },
      {
        id: "states-3",
        item: "StreamRow next-action button states are shown for each stream status: draft → Start, active → Pause, paused → Start, ended → Withdraw.",
      },
      {
        id: "states-4",
        item: "Modal open and close animations are annotated; backdrop click-to-dismiss behaviour is documented.",
      },
      {
        id: "states-5",
        item: "Skeleton loading state (StreamListSkeleton) matches the populated layout — same row count and column widths — so there is no layout shift on load.",
      },
    ],
  },
  {
    id: "grid",
    title: "8px Grid and Spacing",
    items: [
      {
        id: "grid-1",
        item: "All spacing values (padding, margin, gap) are multiples of 8px (or 4px for fine-grained adjustments). Verified with Figma's layout grid overlay.",
      },
      {
        id: "grid-2",
        item: "Component internal padding follows the 8px grid: StreamRow (20–24px), Modal (24px), Card (16px). Any deviation is intentional and annotated.",
      },
      {
        id: "grid-3",
        item: "Responsive breakpoints are defined and annotated: mobile (≤ 640px), tablet (641–1024px), desktop (> 1024px). Grid columns collapse correctly at each breakpoint.",
      },
    ],
  },
  {
    id: "states",
    title: "Empty / Loading / Error States",
    items: [
      {
        id: "empty-1",
        item: "Every list or data screen has three states designed: empty (EmptyState with eyebrow, title, description, and at least one CTA), loading (skeleton), and populated.",
      },
      {
        id: "empty-2",
        item: "Error state is designed for every screen that makes a network or chain call — includes a human-readable message, an optional retry CTA, and does not expose raw error codes.",
      },
      {
        id: "empty-3",
        item: "EmptyState copy is contextual per screen (Streams empty ≠ Activity empty) and reviewed by product / content.",
      },
    ],
  },
  {
    id: "devmode",
    title: "Figma Dev Mode and Component Naming",
    items: [
      {
        id: "dev-1",
        item: "Component names in Figma match agreed code names: StreamRow, StatusBadge, Modal, EmptyState, Card, Skeleton. No orphan or renamed variants without a code counterpart.",
      },
      {
        id: "dev-2",
        item: "All exported assets are named, sliced, and listed in the handoff note (SVG icons, illustration assets). No orphan screens without a named export.",
      },
      {
        id: "dev-3",
        item: "Redlines and component specs are attached or linked in Figma dev mode for every new or changed component before the dev ticket is opened.",
      },
    ],
  },
  {
    id: "stellar",
    title: "Stellar / Soroban / Horizon / Escrow Annotations",
    description: "Mark N/A for screens with no on-chain interaction.",
    items: [
      {
        id: "stellar-1",
        item: 'Any copy referencing Soroban contract state, escrow release, or Horizon transaction status is annotated as "pending API finalisation" until the API contract is signed off. Copy must stay non-committal (e.g. "Funds may take a moment to appear" — not "Funds will appear in 5 seconds").',
      },
      {
        id: "stellar-2",
        item: "Stream lifecycle labels (draft → active → paused → ended) match the agreed StreamStatus type in code. Any new status introduced in design has a corresponding code ticket.",
      },
      {
        id: "stellar-3",
        item: "Vesting or escrow-specific screens (if in scope) annotate which values come from Soroban contract reads vs. Horizon ledger vs. local state — so engineers know the data source for each field.",
      },
      {
        id: "stellar-4",
        item: "On-chain transaction hash or ledger reference (if surfaced in UI) is truncated with a copy / expand affordance designed — not shown as a raw full-length string.",
      },
    ],
  },
];

export const TOTAL_ITEMS = CHECKLIST_SECTIONS.reduce(
  (sum, section) => sum + section.items.length,
  0
);
