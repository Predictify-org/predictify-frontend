/**
 * Client-safe error module barrel.
 * Server routes should import errorResponse from ./server instead.
 */

export type {
  StreamPayError,
  ErrorHandler,
  ErrorFilter,
  ErrorPresentation,
  ErrorSeverity,
  BackendApiErrorResponse,
  HorizonError,
  ErrorNormalizationOptions,
} from "./types";

export {
  isRetryableError,
  getRetryGuidance,
  getUserMessage,
} from "./codes";

export {
  normalizeError,
  isStreamPayError,
  createError,
  isNetworkError,
} from "./mapper";

export {
  formatErrorForDisplay,
  handleError,
  hasFieldErrors,
  getFirstFieldError,
} from "./handler";

export { errorResponse, ErrorCode } from "./server";
export type { ErrorEnvelope } from "./server";
