import { z } from "zod";

/**
 * Market creation domain model and validation.
 *
 * This module is deliberately free of Stellar SDK imports so the form can
 * validate drafts (and be unit tested) without touching the network. Contract
 * encoding lives in `lib/transaction/create-market-intent.ts`.
 */

export const MARKET_CATEGORIES = [
  "Sports",
  "Finance",
  "Entertainment",
  "Politics",
  "Technology",
  "Other",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const MARKET_DRAFT_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 1000,
  outcomeMin: 2,
  outcomeMax: 10,
  outcomeTextMax: 80,
  /** Deadlines further out than this are rejected as unenforceable. */
  maxHorizonDays: 365,
} as const;

export interface MarketOptionDraft {
  text: string;
  /** Optional display-only probability, as a percentage (0-100). */
  probability?: string | number;
}

export interface MarketDraft {
  title: string;
  description: string;
  category: string | null;
  deadline: Date | string | null;
  options: MarketOptionDraft[];
  isPublic: boolean;
  featuredEvent: boolean;
}

export interface MarketOutcome {
  text: string;
  probability?: number;
}

export interface ValidatedMarketDraft {
  title: string;
  description: string;
  category: MarketCategory;
  deadline: Date;
  outcomes: MarketOutcome[];
  isPublic: boolean;
  featuredEvent: boolean;
}

export type MarketDraftField = "title" | "description" | "category" | "deadline" | "options";

export type MarketDraftErrors = Partial<Record<MarketDraftField | "form", string>>;

export type MarketDraftValidation =
  | { success: true; data: ValidatedMarketDraft; errors: MarketDraftErrors }
  | { success: false; data: null; errors: MarketDraftErrors };

const optionSchema = z.object({
  text: z
    .string({ required_error: "Add at least 2 outcomes" })
    .trim()
    .max(
      MARKET_DRAFT_LIMITS.outcomeTextMax,
      `Outcomes must be ${MARKET_DRAFT_LIMITS.outcomeTextMax} characters or fewer`,
    ),
  probability: z.union([z.string(), z.number()]).optional().nullable(),
});

const marketDraftSchema = z.object({
  title: z
    .string({ required_error: "Enter a title" })
    .trim()
    .min(1, "Enter a title")
    .min(
      MARKET_DRAFT_LIMITS.titleMin,
      `Title must be at least ${MARKET_DRAFT_LIMITS.titleMin} characters`,
    )
    .max(
      MARKET_DRAFT_LIMITS.titleMax,
      `Title must be ${MARKET_DRAFT_LIMITS.titleMax} characters or fewer`,
    ),
  description: z
    .string({ required_error: "Enter a description" })
    .trim()
    .min(1, "Enter a description")
    .min(
      MARKET_DRAFT_LIMITS.descriptionMin,
      `Description must be at least ${MARKET_DRAFT_LIMITS.descriptionMin} characters`,
    )
    .max(
      MARKET_DRAFT_LIMITS.descriptionMax,
      `Description must be ${MARKET_DRAFT_LIMITS.descriptionMax} characters or fewer`,
    ),
  category: z.enum(MARKET_CATEGORIES, {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  deadline: z.date({
    required_error: "Choose a deadline",
    invalid_type_error: "Choose a deadline",
  }),
  options: z
    .array(optionSchema)
    .min(
      MARKET_DRAFT_LIMITS.outcomeMin,
      `Add at least ${MARKET_DRAFT_LIMITS.outcomeMin} outcomes`,
    )
    .max(
      MARKET_DRAFT_LIMITS.outcomeMax,
      `Add ${MARKET_DRAFT_LIMITS.outcomeMax} outcomes or fewer`,
    ),
  isPublic: z.boolean(),
  featuredEvent: z.boolean(),
});

function normalizeDeadline(value: MarketDraft["deadline"]): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function hasProbability(value: MarketOptionDraft["probability"] | null): boolean {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  return value !== undefined && value !== null;
}

function normalizeProbability(
  value: MarketOptionDraft["probability"] | null,
): number | undefined {
  if (!hasProbability(value)) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fieldFromIssuePath(path: (string | number)[]): MarketDraftField | "form" {
  const root = path[0];
  if (root === "title" || root === "description" || root === "category" || root === "deadline" || root === "options") {
    return root;
  }
  return "form";
}

function mapIssues(issues: z.ZodIssue[]): MarketDraftErrors {
  const errors: MarketDraftErrors = {};
  for (const issue of issues) {
    const field = fieldFromIssuePath(issue.path);
    // Keep the first (usually most specific) message per field.
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Validate a market draft and return inline field errors plus normalized data.
 *
 * `now` is injectable so deadline rules are deterministic in tests.
 */
export function validateMarketDraft(
  draft: MarketDraft,
  options: { now?: Date } = {},
): MarketDraftValidation {
  const now = options.now ?? new Date();
  const deadline = normalizeDeadline(draft.deadline);

  const result = marketDraftSchema.superRefine((value, ctx) => {
    const deadlineMs = value.deadline.getTime();
    if (deadlineMs <= now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadline"],
        message: "Deadline must be in the future",
      });
    } else if (deadlineMs > now.getTime() + MARKET_DRAFT_LIMITS.maxHorizonDays * 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadline"],
        message: `Deadline must be within ${MARKET_DRAFT_LIMITS.maxHorizonDays} days`,
      });
    }

    const seen = new Map<string, number>();
    value.options.forEach((option, index) => {
      const text = option.text.trim();
      if (text.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "text"],
          message: `Outcome ${index + 1} cannot be empty`,
        });
        return;
      }
      const key = text.toLocaleLowerCase();
      const firstIndex = seen.get(key);
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "text"],
          message: `Outcome “${text}” duplicates outcome ${firstIndex + 1}`,
        });
        return;
      }
      seen.set(key, index);

      const probability = normalizeProbability(option.probability);
      if (hasProbability(option.probability) && probability === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "probability"],
          message: `Outcome ${index + 1} has an invalid probability`,
        });
      } else if (probability !== undefined && (probability < 0 || probability > 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "probability"],
          message: `Outcome ${index + 1} probability must be between 0 and 100`,
        });
      }
    });
  }).safeParse({
    ...draft,
    deadline: deadline ?? draft.deadline,
  });

  if (!result.success) {
    return { success: false, data: null, errors: mapIssues(result.error.issues) };
  }

  return {
    success: true,
    data: {
      title: result.data.title,
      description: result.data.description,
      category: result.data.category,
      deadline: result.data.deadline,
      outcomes: result.data.options.map((option) => ({
        text: option.text,
        probability: normalizeProbability(option.probability),
      })),
      isPublic: result.data.isPublic,
      featuredEvent: result.data.featuredEvent,
    },
    errors: {},
  };
}

/**
 * Stable JSON representation of the on-chain portion of a draft.
 *
 * Option probabilities are display-only and intentionally excluded so changing
 * them does not produce a different create_market transaction.
 */
export function canonicalizeMarketDraft(draft: ValidatedMarketDraft): string {
  return JSON.stringify({
    title: draft.title,
    description: draft.description,
    category: draft.category,
    deadline: Math.floor(draft.deadline.getTime() / 1000),
    outcomes: draft.outcomes.map((outcome) => outcome.text),
    isPublic: draft.isPublic,
    featuredEvent: draft.featuredEvent,
  });
}
