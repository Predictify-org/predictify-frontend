/**
 * Environment variable validation and type-safe access.
 *
 * Public variables are validated with zod:
 *  - URL variables must parse with `new URL` and use http(s); trailing slashes
 *    are normalised away (e.g. `https://app.example.com/` → `https://app.example.com`).
 *  - `NEXT_PUBLIC_STELLAR_NETWORK` must be `testnet` or `mainnet` (case-insensitive).
 *  - `NEXT_PUBLIC_APP_NAME` must be non-empty after trimming.
 *  - `NEXT_PUBLIC_ANALYTICS_ID` is optional (empty/whitespace disables analytics).
 *
 * Failure behaviour:
 *  - `parseEnv()` (pure) rejects invalid input by throwing an aggregated error.
 *  - In production, `validateEnv()` throws the same aggregated error, and it runs
 *    automatically when this module is imported.
 *  - Outside production (development/test), invalid values fall back to the
 *    documented defaults and a warning is printed, so local work is never
 *    blocked by a typo in `.env.local`.
 *
 * Defaults are applied only when a variable is *unset*; an explicitly empty or
 * whitespace-only value for a required variable is rejected.
 */

import { z } from 'zod';

/** Stellar networks accepted by the application. */
export const STELLAR_NETWORKS = ['testnet', 'mainnet'] as const;

export type StellarNetwork = (typeof STELLAR_NETWORKS)[number];

const DEFAULT_STELLAR_NETWORK: StellarNetwork = 'testnet';
const DEFAULT_API_URL = 'http://localhost:3000/api';
const DEFAULT_APP_NAME = 'Predictify';
const DEFAULT_APP_URL = 'http://localhost:3000';
const DEFAULT_USE_MOCKS = 'false';
const DEFAULT_NODE_ENV = 'development';

/** Trim string input, leaving non-string input untouched for zod to report. */
function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** True when `value` is an absolute http(s) URL. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Remove trailing slashes, which would otherwise produce `//` path joins. */
function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/** A required absolute http(s) URL with a default and trailing-slash normalisation. */
function httpUrlSchema(defaultValue: string) {
  return z
    .preprocess(
      trimString,
      z
        .string({ required_error: 'must be a string' })
        .superRefine((value, ctx) => {
          if (value.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'must not be empty',
            });
            return;
          }

          if (!isHttpUrl(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'must be a valid absolute http(s) URL',
            });
          }
        })
        .transform(stripTrailingSlashes)
    )
    .default(defaultValue);
}

const stellarNetworkSchema = z
  .preprocess(
    (value) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    z.enum(STELLAR_NETWORKS, {
      errorMap: () => ({ message: "must be 'testnet' or 'mainnet'" }),
    })
  )
  .default(DEFAULT_STELLAR_NETWORK);

const useMocksSchema = z
  .preprocess(
    (value) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    z.enum(['true', 'false'], {
      errorMap: () => ({ message: "must be 'true' or 'false'" }),
    })
  )
  .default(DEFAULT_USE_MOCKS);

const appNameSchema = z
  .preprocess(trimString, z.string().min(1, 'must not be empty'))
  .default(DEFAULT_APP_NAME);

const analyticsIdSchema = z
  .preprocess(
    (value) => {
      const trimmed = trimString(value);
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().min(1, 'must not be empty').optional()
  )
  .transform((value) => value ?? '');

const nodeEnvSchema = z
  .preprocess(trimString, z.string().min(1, 'must not be empty'))
  .default(DEFAULT_NODE_ENV);

const envSchema = z.object({
  // Stellar Configuration
  NEXT_PUBLIC_STELLAR_NETWORK: stellarNetworkSchema,

  // API Configuration
  NEXT_PUBLIC_API_URL: httpUrlSchema(DEFAULT_API_URL),
  NEXT_PUBLIC_USE_MOCKS: useMocksSchema,

  // Application Configuration
  NEXT_PUBLIC_APP_NAME: appNameSchema,
  NEXT_PUBLIC_APP_URL: httpUrlSchema(DEFAULT_APP_URL),

  // Optional: Analytics
  NEXT_PUBLIC_ANALYTICS_ID: analyticsIdSchema,

  // Node Environment
  NODE_ENV: nodeEnvSchema,
});

/** Public environment variables (safe to expose to client). */
export type Env = z.infer<typeof envSchema>;

export interface EnvResolution {
  /** A usable env object; invalid keys are replaced by their defaults. */
  env: Env;
  /** Every validation problem found in `source`, in readable form. */
  issues: z.ZodIssue[];
}

/** Render validation issues as a multi-line, human-readable error message. */
export function formatEnvIssues(issues: z.ZodIssue[]): string {
  const lines = issues.map((issue) => {
    const key = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `  - ${key}: ${issue.message}`;
  });

  return ['Invalid environment variables:', ...lines].join('\n');
}

/**
 * Parse and validate environment values.
 *
 * Pure: the result depends only on `source`. Missing keys use the documented
 * defaults; invalid values (empty, whitespace-only or malformed URLs) throw an
 * aggregated error listing every problem.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(formatEnvIssues(result.error.issues));
  }

  return result.data;
}

/**
 * Resolve env values, replacing invalid keys with their defaults.
 *
 * Used to keep development working (with a warning) while still reporting all
 * problems; production turns the issues into a thrown error via `validateEnv`.
 */
export function resolveEnv(
  source: Record<string, string | undefined>
): EnvResolution {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return { env: result.data, issues: [] };
  }

  const issues = result.error.issues;

  // Drop only the offending keys so their defaults apply while every valid
  // value is preserved.
  const sanitized = { ...source };
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string') {
      delete sanitized[key];
    }
  }

  const fallback = envSchema.safeParse(sanitized);

  return {
    env: fallback.success ? fallback.data : envSchema.parse({}),
    issues,
  };
}

function reportEnvIssues(issues: z.ZodIssue[], isProduction: boolean): void {
  if (issues.length === 0) {
    return;
  }

  const message = formatEnvIssues(issues);

  if (isProduction) {
    throw new Error(message);
  }

  console.warn(`${message}\nFalling back to defaults outside production.`);
}

/**
 * Validate the process environment.
 *
 * Throws an aggregated error in production and warns in other environments.
 */
export function validateEnv(): void {
  const { issues } = resolveEnv(process.env);
  reportEnvIssues(issues, process.env.NODE_ENV === 'production');
}

const resolved = resolveEnv(process.env);

/**
 * Validated public environment variables.
 *
 * Consumers (`lib/config.ts`, clients) read these values; invalid values are
 * never surfaced here — they fall back to defaults outside production and fail
 * the import in production.
 */
export const env: Env = resolved.env;

// Validate on import in production; warn (but keep defaults) everywhere else.
reportEnvIssues(resolved.issues, process.env.NODE_ENV === 'production');
