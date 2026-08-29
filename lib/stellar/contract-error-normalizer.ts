/**
 * contract-error-normalizer.ts
 *
 * Normalizes raw Soroban/Stellar/wallet errors into structured, user-facing
 * messages with action hints. No raw internal error details are ever exposed
 * in user-visible fields; only code, isRetryable, and isSensitive carry
 * semantics that callers may act on programmatically.
 *
 * Invariants:
 *  - title and description MUST NOT contain addresses, hashes, internal codes,
 *    or any detail that could leak sensitive infrastructure information.
 *  - The `raw` field MAY be logged server-side but MUST NOT be displayed to users.
 *  - Every public function is pure and deterministic (same input → same output).
 *  - Concurrency: all functions are stateless and safe to call concurrently.
 */

// ---------------------------------------------------------------------------
// Error code taxonomy
// ---------------------------------------------------------------------------

/**
 * Canonical codes for every known failure category.
 *
 * Soroban contract error indices are determined by the order of variants in the
 * Rust `ContractError` enum (1-indexed as Soroban uses 1 for the first variant).
 *
 * Mapping from recovery.rs ContractError enum:
 *  TooManyMarkets  → #1
 *  PlanTooLarge    → #2
 *  Overflow        → #3
 *  MarketNotFound  → #4
 *  NotInitialized  → #5
 */
export const ContractErrorCode = {
  // ── Soroban / WASM contract errors ───────────────────────────────────────
  /** Caller passed more market IDs than the contract allows per call. */
  TooManyMarkets: 'CONTRACT_TOO_MANY_MARKETS',
  /** Recovery plan exceeds the maximum number of balance mutations. */
  PlanTooLarge: 'CONTRACT_PLAN_TOO_LARGE',
  /** Arithmetic overflow in contract balance accounting. */
  Overflow: 'CONTRACT_OVERFLOW',
  /** Requested market ID does not exist in contract storage. */
  MarketNotFound: 'CONTRACT_MARKET_NOT_FOUND',
  /** Contract has not been initialised (admin not set). */
  NotInitialized: 'CONTRACT_NOT_INITIALIZED',

  // ── Resolution errors ────────────────────────────────────────────────────
  /** Attempt to resolve a market that was already resolved. */
  AlreadyResolved: 'CONTRACT_ALREADY_RESOLVED',
  /** Market resolution failed after exhausting all oracle providers. */
  MarketFailed: 'CONTRACT_MARKET_FAILED',
  /** Oracle query failed or returned an unexpected response. */
  OracleError: 'CONTRACT_ORACLE_ERROR',

  // ── Horizon transaction result codes ─────────────────────────────────────
  /** Transaction signature is invalid. */
  BadAuth: 'HORIZON_TX_BAD_AUTH',
  /** Sequence number does not match the source account. */
  BadSeq: 'HORIZON_TX_BAD_SEQ',
  /** Transaction fee is below the network minimum. */
  InsufficientFee: 'HORIZON_TX_INSUFFICIENT_FEE',
  /** Source account does not exist on the network. */
  NoSourceAccount: 'HORIZON_TX_NO_SOURCE_ACCOUNT',
  /** An operation in the transaction failed authorisation. */
  OpBadAuth: 'HORIZON_OP_BAD_AUTH',
  /** The operation source account does not exist. */
  OpNoSourceAccount: 'HORIZON_OP_NO_SOURCE_ACCOUNT',
  /** Account does not have enough XLM to cover the transaction. */
  InsufficientBalance: 'HORIZON_TX_INSUFFICIENT_BALANCE',
  /** Transaction failed but the specific reason is not in the known set. */
  TxFailed: 'HORIZON_TX_FAILED',

  // ── Wallet / signing errors ───────────────────────────────────────────────
  /** User dismissed the wallet prompt. */
  UserRejected: 'WALLET_USER_REJECTED',
  /** Wallet extension is not installed. */
  WalletNotFound: 'WALLET_NOT_FOUND',
  /** Wallet extension is locked or the user is not logged in. */
  WalletLocked: 'WALLET_LOCKED',
  /** App network (testnet/mainnet) does not match the wallet's network. */
  NetworkMismatch: 'WALLET_NETWORK_MISMATCH',
  /** Wallet did not respond within the expected time. */
  WalletTimeout: 'WALLET_TIMEOUT',

  // ── Network / infra errors ────────────────────────────────────────────────
  /** Transaction was submitted but confirmation polling timed out. */
  ConfirmationTimeout: 'CONFIRMATION_TIMEOUT',
  /** Network request failed entirely (offline, DNS, etc.). */
  NetworkError: 'NETWORK_ERROR',

  // ── Generic ───────────────────────────────────────────────────────────────
  /** Error code could not be determined. */
  Unknown: 'UNKNOWN',
} as const;

export type ContractErrorCode =
  (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

// ---------------------------------------------------------------------------
// NormalizedError
// ---------------------------------------------------------------------------

/**
 * A structured, user-facing representation of a contract or wallet error.
 *
 * Callers MUST use `title` and `description` for user-visible strings.
 * They MUST NOT display `raw` or derive user messages from `code` directly
 * without referencing the approved copy in this module.
 */
export interface NormalizedError {
  /**
   * Canonical error code (see ContractErrorCode).
   * Safe for programmatic comparison, logging, and metrics.
   */
  readonly code: ContractErrorCode;

  /**
   * Short, user-facing title (≤ 8 words). Safe for toast headers.
   * Never contains addresses, hashes, or raw error strings.
   */
  readonly title: string;

  /**
   * One-sentence explanation suitable for a toast body or modal paragraph.
   * Always ends with a period. Never exposes internal details.
   */
  readonly description: string;

  /**
   * Concrete, imperative action the user can take right now.
   * Phrased as a directive: "Check your wallet and try again."
   */
  readonly actionHint: string;

  /**
   * Whether the exact same call can be retried safely.
   * `true` for transient infra failures; `false` for logical/auth errors.
   */
  readonly isRetryable: boolean;

  /**
   * Whether the raw error string might contain sensitive data (keys,
   * addresses, internal codes). When `true`, callers MUST NOT log `raw`
   * in client-visible surfaces.
   */
  readonly isSensitive: boolean;

  /**
   * The original error string, stripped of any leading/trailing whitespace.
   * For diagnostic purposes only — never display to users.
   * `undefined` when no raw error was provided.
   */
  readonly raw: string | undefined;
}

// ---------------------------------------------------------------------------
// Result-code payloads (Horizon API shape)
// ---------------------------------------------------------------------------

/**
 * Horizon extras.result_codes shape, partially typed.
 * Callers may pass the full extras object; only the relevant fields are used.
 */
export interface HorizonResultCodes {
  transaction?: string | null;
  operations?: ReadonlyArray<string | null> | null;
}

// ---------------------------------------------------------------------------
// Internal copy table
// ---------------------------------------------------------------------------

interface ErrorEntry {
  title: string;
  description: string;
  actionHint: string;
  isRetryable: boolean;
  isSensitive: boolean;
}

/**
 * Approved user-facing copy for each error code.
 *
 * Tone principles:
 *  - Empathic acknowledgement ("We couldn't …")
 *  - Concrete cause without internal jargon
 *  - Imperative next action
 *  - Plain-language, WCAG 2.1 AA readable (grade ≤ 7)
 */
const ERROR_TABLE: Readonly<Record<ContractErrorCode, ErrorEntry>> = {
  [ContractErrorCode.TooManyMarkets]: {
    title: 'Too many markets selected',
    description:
      'The request included more markets than the contract allows in a single call.',
    actionHint: 'Reduce the number of markets and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.PlanTooLarge]: {
    title: 'Recovery plan too large',
    description:
      'The recovery plan exceeds the maximum size the contract can process at once.',
    actionHint: 'Split the recovery into smaller batches and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.Overflow]: {
    title: 'Balance overflow',
    description:
      'An internal balance calculation exceeded the allowed range.',
    actionHint: 'Contact support — this may indicate a contract configuration issue.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.MarketNotFound]: {
    title: 'Market not found',
    description: 'The market you requested could not be found on the network.',
    actionHint:
      'Refresh the page and verify the market is still active before trying again.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.NotInitialized]: {
    title: 'Contract not initialised',
    description:
      'The contract has not been fully set up yet and cannot process requests.',
    actionHint: 'Contact support — the contract requires admin initialisation.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.AlreadyResolved]: {
    title: 'Market already resolved',
    description: 'This market has already been resolved and cannot be resolved again.',
    actionHint: 'Refresh the page to see the latest market status.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.MarketFailed]: {
    title: 'Market resolution failed',
    description:
      'This market could not be resolved after all oracle providers were tried.',
    actionHint: 'Check the market status and contact support if the issue persists.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.OracleError]: {
    title: 'Oracle unavailable',
    description:
      'The price oracle returned an unexpected response during market resolution.',
    actionHint: 'Wait a few minutes and try again — oracles may be temporarily unavailable.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.BadAuth]: {
    title: 'Invalid signature',
    description:
      'The transaction signature was rejected by the network.',
    actionHint: 'Make sure your wallet is unlocked and try signing again.',
    isRetryable: true,
    isSensitive: true,
  },
  [ContractErrorCode.BadSeq]: {
    title: 'Sequence number mismatch',
    description:
      'The transaction sequence number does not match your account.',
    actionHint:
      'Refresh the page to sync your account state, then try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.InsufficientFee]: {
    title: 'Transaction fee too low',
    description:
      'The transaction fee was below the current network minimum.',
    actionHint: 'Try again — the app will use an updated fee estimate.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.NoSourceAccount]: {
    title: 'Account not found',
    description:
      'Your Stellar account does not exist on the network or has been merged.',
    actionHint:
      'Make sure your account is funded (minimum 1 XLM) and try again.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.OpBadAuth]: {
    title: 'Operation authorisation failed',
    description:
      'One of the operations in the transaction failed an authorisation check.',
    actionHint: 'Check that your wallet is correctly configured and try again.',
    isRetryable: true,
    isSensitive: true,
  },
  [ContractErrorCode.OpNoSourceAccount]: {
    title: 'Operation source account missing',
    description:
      'An operation in the transaction references an account that does not exist.',
    actionHint: 'Contact support if this error persists.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.InsufficientBalance]: {
    title: 'Insufficient balance',
    description: 'Your account does not have enough XLM to complete this transaction.',
    actionHint: 'Top up your account balance and try again.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.TxFailed]: {
    title: 'Transaction failed',
    description: 'The transaction was rejected by the network.',
    actionHint: 'Check your wallet balance and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.UserRejected]: {
    title: 'Transaction cancelled',
    description: 'You cancelled the transaction in your wallet.',
    actionHint: 'Click the action button again when you are ready to approve.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.WalletNotFound]: {
    title: 'Wallet not found',
    description:
      'We could not find a compatible wallet extension in your browser.',
    actionHint:
      'Install a supported wallet (Freighter, LOBSTR, XBull, Albedo, or Rabet) and try again.',
    isRetryable: false,
    isSensitive: false,
  },
  [ContractErrorCode.WalletLocked]: {
    title: 'Wallet is locked',
    description: 'Your wallet extension is locked or you are not logged in.',
    actionHint: 'Unlock your wallet and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.NetworkMismatch]: {
    title: 'Wrong network',
    description:
      'Your wallet is connected to a different network than this app.',
    actionHint:
      'Switch your wallet to the correct network (Testnet or Mainnet) and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.WalletTimeout]: {
    title: 'Wallet did not respond',
    description:
      'Your wallet extension took too long to respond to the request.',
    actionHint: 'Check that your wallet extension is not paused, then try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.ConfirmationTimeout]: {
    title: 'Confirmation timed out',
    description:
      'The transaction was submitted but did not appear on the network in time.',
    actionHint:
      'Check the transaction history in a Stellar explorer, then retry if it was not recorded.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.NetworkError]: {
    title: 'Network error',
    description: 'A network request failed — you may be offline or the service is unavailable.',
    actionHint: 'Check your internet connection and try again.',
    isRetryable: true,
    isSensitive: false,
  },
  [ContractErrorCode.Unknown]: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred while processing your request.',
    actionHint: 'Please try again. Contact support if the issue persists.',
    isRetryable: true,
    isSensitive: true,
  },
};

// ---------------------------------------------------------------------------
// Classification helpers (all pure, no side effects)
// ---------------------------------------------------------------------------

/**
 * Map a Soroban contract error index to a ContractErrorCode.
 *
 * The index is derived from the order of variants in the Rust ContractError
 * enum (1-indexed as Soroban uses 1 for the first variant by convention).
 */
function codeFromContractIndex(index: number): ContractErrorCode {
  switch (index) {
    case 1:
      return ContractErrorCode.TooManyMarkets;
    case 2:
      return ContractErrorCode.PlanTooLarge;
    case 3:
      return ContractErrorCode.Overflow;
    case 4:
      return ContractErrorCode.MarketNotFound;
    case 5:
      return ContractErrorCode.NotInitialized;
    default:
      return ContractErrorCode.Unknown;
  }
}

/**
 * Attempt to extract a contract error index from a raw Soroban error string.
 *
 * Soroban encodes contract errors as:
 *  - `Error(Contract, #N)` — from the SDK / host
 *  - `ContractError(N)` — alternative encoding in some SDK versions
 *
 * Returns `undefined` when no contract index is found.
 */
function extractContractErrorIndex(raw: string): number | undefined {
  // Match "Error(Contract, #N)" or "Error(Contract,#N)"
  const contractHashMatch = /Error\s*\(\s*Contract\s*,\s*#(\d+)\s*\)/i.exec(raw);
  if (contractHashMatch) {
    return parseInt(contractHashMatch[1], 10);
  }

  // Match "ContractError(N)"
  const contractErrorMatch = /ContractError\s*\((\d+)\)/i.exec(raw);
  if (contractErrorMatch) {
    return parseInt(contractErrorMatch[1], 10);
  }

  return undefined;
}

/**
 * Classify a raw error string against known wallet error patterns.
 * Returns a ContractErrorCode when matched, otherwise `undefined`.
 */
function classifyWalletError(lower: string): ContractErrorCode | undefined {
  if (/reject|denied|cancel|user aborted|user dismissed/i.test(lower)) {
    return ContractErrorCode.UserRejected;
  }
  if (/not found|not installed|not available|extension not/i.test(lower)) {
    return ContractErrorCode.WalletNotFound;
  }
  if (/\block(ed)?\b|unlock|logged out|not unlocked/i.test(lower)) {
    return ContractErrorCode.WalletLocked;
  }
  if (/network.*mismatch|mismatch.*network|wrong network|\btestnet\b|\bmainnet\b/i.test(lower)) {
    return ContractErrorCode.NetworkMismatch;
  }
  if (/timed? out|timeout/i.test(lower)) {
    return ContractErrorCode.WalletTimeout;
  }
  return undefined;
}

/**
 * Classify a Horizon transaction result code.
 */
function classifyHorizonTxCode(code: string): ContractErrorCode {
  switch (code.toLowerCase()) {
    case 'tx_bad_auth':
      return ContractErrorCode.BadAuth;
    case 'tx_bad_seq':
      return ContractErrorCode.BadSeq;
    case 'tx_insufficient_fee':
      return ContractErrorCode.InsufficientFee;
    case 'tx_no_source_account':
      return ContractErrorCode.NoSourceAccount;
    case 'tx_insufficient_balance':
      return ContractErrorCode.InsufficientBalance;
    case 'tx_failed':
      return ContractErrorCode.TxFailed;
    default:
      return ContractErrorCode.TxFailed;
  }
}

/**
 * Classify a Horizon operation result code.
 */
function classifyHorizonOpCode(code: string): ContractErrorCode {
  switch (code.toLowerCase()) {
    case 'op_bad_auth':
      return ContractErrorCode.OpBadAuth;
    case 'op_no_source_account':
      return ContractErrorCode.OpNoSourceAccount;
    default:
      return ContractErrorCode.TxFailed;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a NormalizedError from a raw error string and optional Horizon result codes.
 *
 * Precedence (highest → lowest):
 *  1. Soroban contract error index ("Error(Contract, #N)" or "ContractError(N)")
 *  2. WASM trap / host error (generic contract execution failure)
 *  3. Horizon operation result codes (ops[0] first)
 *  4. Horizon transaction result code
 *  5. Raw string Horizon tx/op codes (when no resultCodes provided)
 *  6. Wallet / signing errors
 *  7. Network / connectivity errors
 *  8. Unknown fallback
 *
 * This function is pure and stateless — safe to call concurrently.
 *
 * @param rawError  The raw error message from the wallet SDK or Horizon API.
 *                  May be `undefined` (treated as unknown).
 * @param resultCodes  Optional Horizon extras.result_codes object.
 */
export function normalizeContractError(
  rawError: string | undefined,
  resultCodes?: HorizonResultCodes,
): NormalizedError {
  const raw = typeof rawError === 'string' ? rawError.trim() : undefined;
  const lower = (raw ?? '').toLowerCase();

  // ── 1. Soroban contract error index ─────────────────────────────────────
  if (raw) {
    const contractIndex = extractContractErrorIndex(raw);
    if (contractIndex !== undefined) {
      const code = codeFromContractIndex(contractIndex);
      return build(code, raw);
    }
  }

  // ── 2. WASM trap / host error (non-indexed) ───────────────────────────────
  if (lower.includes('wasm_trap') || lower.includes('wasm trap')) {
    return build(ContractErrorCode.TxFailed, raw);
  }
  if (lower.includes('panicmsg:') || lower.includes('panic with')) {
    return build(ContractErrorCode.TxFailed, raw);
  }

  // ── 3. Horizon operation codes ───────────────────────────────────────────
  const opCode = resultCodes?.operations?.[0];
  if (typeof opCode === 'string' && opCode.length > 0) {
    return build(classifyHorizonOpCode(opCode), raw);
  }

  // ── 4. Horizon transaction result code ──────────────────────────────────
  const txCode = resultCodes?.transaction;
  if (typeof txCode === 'string' && txCode.length > 0) {
    return build(classifyHorizonTxCode(txCode), raw);
  }

  // ── 5. Raw string Horizon tx/op codes (no resultCodes supplied) ───────────
  if (raw) {
    if (/\btx_bad_auth\b/i.test(raw)) return build(ContractErrorCode.BadAuth, raw);
    if (/\btx_bad_seq\b/i.test(raw)) return build(ContractErrorCode.BadSeq, raw);
    if (/\btx_insufficient_fee\b/i.test(raw)) return build(ContractErrorCode.InsufficientFee, raw);
    if (/\btx_no_source_account\b/i.test(raw)) return build(ContractErrorCode.NoSourceAccount, raw);
    if (/\btx_insufficient_balance\b/i.test(raw)) return build(ContractErrorCode.InsufficientBalance, raw);
    if (/\btx_failed\b/i.test(raw)) return build(ContractErrorCode.TxFailed, raw);
    if (/\bop_bad_auth\b/i.test(raw)) return build(ContractErrorCode.OpBadAuth, raw);
    if (/\bop_no_source_account\b/i.test(raw)) return build(ContractErrorCode.OpNoSourceAccount, raw);
  }

  // ── 6. Confirmation timeout (before wallet timeout to avoid false match) ──
  if (lower.includes('did not confirm') || lower.includes('confirmation timeout')) {
    return build(ContractErrorCode.ConfirmationTimeout, raw);
  }

  // ── 7. Wallet / signing errors ───────────────────────────────────────────
  if (raw) {
    const walletCode = classifyWalletError(lower);
    if (walletCode !== undefined) {
      return build(walletCode, raw);
    }
  }

  // ── 8. Network / connectivity errors ─────────────────────────────────────
  if (
    lower.includes('network error') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return build(ContractErrorCode.NetworkError, raw);
  }
  if (
    lower.includes('offline') ||
    lower.includes('no internet') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound')
  ) {
    return build(ContractErrorCode.NetworkError, raw);
  }

  // ── 8. Unknown fallback ───────────────────────────────────────────────────
  return build(ContractErrorCode.Unknown, raw);
}

/**
 * Convenience: build a NormalizedError from a TransactionFailureType string.
 *
 * This allows the transaction hook to call the normalizer with its own
 * failure type vocabulary without duplicating classification logic.
 */
export function normalizeFromFailureType(
  failureType: string,
  rawError?: string,
): NormalizedError {
  switch (failureType) {
    case 'userRejected':
      return build(ContractErrorCode.UserRejected, rawError);
    case 'signFailed':
      return normalizeContractError(rawError);
    case 'submitFailed':
      return normalizeContractError(rawError);
    case 'confirmationTimeout':
      return build(ContractErrorCode.ConfirmationTimeout, rawError);
    case 'confirmationFailed':
      return normalizeContractError(rawError);
    case 'buildFailed':
      return normalizeContractError(rawError);
    default:
      return normalizeContractError(rawError);
  }
}

// ---------------------------------------------------------------------------
// Private builder
// ---------------------------------------------------------------------------

/** Construct a NormalizedError from a code and optional raw string. */
function build(code: ContractErrorCode, raw: string | undefined): NormalizedError {
  const entry = ERROR_TABLE[code];
  return {
    code,
    title: entry.title,
    description: entry.description,
    actionHint: entry.actionHint,
    isRetryable: entry.isRetryable,
    isSensitive: entry.isSensitive,
    raw,
  };
}
