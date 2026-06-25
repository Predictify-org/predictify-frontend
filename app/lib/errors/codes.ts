/**
 * Error Code Definitions and Metadata
 * 
 * Central registry of all error codes with their metadata,
 * retry guidance, and user-facing messages.
 */

import type { ErrorCode, ErrorCategory, RetryGuidance } from './types';

export type { ErrorCode };

/**
 * Metadata for each error code
 */
export interface ErrorCodeMetadata {
  /** Machine-readable code */
  code: ErrorCode;
  /** HTTP status code typically associated */
  httpStatus: number;
  /** Error category for grouping */
  category: ErrorCategory;
  /** Short human-readable title */
  title: string;
  /** Safe user-facing message (no internal details) */
  userMessage: string;
  /** Technical description for developers */
  technicalDescription: string;
  /** Retry guidance for recovery */
  retry: RetryGuidance;
  /** RFC 7807 type URI */
  typeUri: string;
}

/**
 * Base URI for RFC 7807 error types
 */
const BASE_TYPE_URI = 'https://api.streampay.io/errors';

/**
 * Complete error code registry
 */
export const ERROR_REGISTRY: Record<ErrorCode, ErrorCodeMetadata> = {
  // HTTP Client Errors (4xx)
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    httpStatus: 400,
    category: 'client',
    title: 'Bad Request',
    userMessage: 'The request could not be understood. Please check your input and try again.',
    technicalDescription: 'The server cannot process the request due to client error (malformed syntax, invalid message framing, etc.)',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/bad-request`,
  },
  
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    httpStatus: 401,
    category: 'auth',
    title: 'Unauthorized',
    userMessage: 'Please sign in to continue.',
    technicalDescription: 'Authentication is required and has failed or has not been provided',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/unauthorized`,
  },
  
  FORBIDDEN: {
    code: 'FORBIDDEN',
    httpStatus: 403,
    category: 'auth',
    title: 'Forbidden',
    userMessage: 'You do not have permission to perform this action.',
    technicalDescription: 'The server understood the request but refuses to authorize it',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/forbidden`,
  },
  
  NOT_FOUND: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    category: 'client',
    title: 'Not Found',
    userMessage: 'The requested resource could not be found.',
    technicalDescription: 'The requested resource does not exist',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/not-found`,
  },
  
  METHOD_NOT_ALLOWED: {
    code: 'METHOD_NOT_ALLOWED',
    httpStatus: 405,
    category: 'client',
    title: 'Method Not Allowed',
    userMessage: 'This action is not supported. Please try a different approach.',
    technicalDescription: 'The request method is not supported for the requested resource',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/method-not-allowed`,
  },
  
  CONFLICT: {
    code: 'CONFLICT',
    httpStatus: 409,
    category: 'client',
    title: 'Conflict',
    userMessage: 'This action conflicts with the current state. Please refresh and try again.',
    technicalDescription: 'The request conflicts with the current state of the resource',
    retry: { retryable: true, suggestedDelayMs: 1000, maxRetries: 1 },
    typeUri: `${BASE_TYPE_URI}/conflict`,
  },
  
  UNPROCESSABLE_ENTITY: {
    code: 'UNPROCESSABLE_ENTITY',
    httpStatus: 422,
    category: 'validation',
    title: 'Unprocessable Entity',
    userMessage: 'We could not process your request. Please check your information and try again.',
    technicalDescription: 'The request was well-formed but contains semantic errors',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/unprocessable-entity`,
  },
  
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    httpStatus: 429,
    category: 'client',
    title: 'Rate Limited',
    userMessage: 'Too many requests. Please wait a moment and try again.',
    technicalDescription: 'The user has sent too many requests in a given amount of time',
    retry: { retryable: true, suggestedDelayMs: 2000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/rate-limited`,
  },
  
  REQUEST_TIMEOUT: {
    code: 'REQUEST_TIMEOUT',
    httpStatus: 408,
    category: 'client',
    title: 'Request Timeout',
    userMessage: 'The request timed out. Please try again.',
    technicalDescription: 'The server timed out waiting for the request',
    retry: { retryable: true, suggestedDelayMs: 1000, maxRetries: 2 },
    typeUri: `${BASE_TYPE_URI}/request-timeout`,
  },
  
  // HTTP Server Errors (5xx)
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    httpStatus: 500,
    category: 'server',
    title: 'Internal Server Error',
    userMessage: 'Something went wrong on our end. Please try again later.',
    technicalDescription: 'The server encountered an unexpected condition',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/internal-error`,
  },
  
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    httpStatus: 503,
    category: 'server',
    title: 'Service Unavailable',
    userMessage: 'Our service is temporarily unavailable. Please try again later.',
    technicalDescription: 'The server is currently unable to handle the request',
    retry: { retryable: true, suggestedDelayMs: 5000, maxRetries: 5, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/service-unavailable`,
  },
  
  GATEWAY_TIMEOUT: {
    code: 'GATEWAY_TIMEOUT',
    httpStatus: 504,
    category: 'server',
    title: 'Gateway Timeout',
    userMessage: 'The connection timed out. Please try again later.',
    technicalDescription: 'The server did not receive a timely response from an upstream server',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/gateway-timeout`,
  },
  
  // Stellar/Blockchain Errors
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    httpStatus: 400,
    category: 'blockchain',
    title: 'Insufficient Funds',
    userMessage: 'You do not have enough funds to complete this transaction.',
    technicalDescription: 'The account does not have sufficient balance for the transaction',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/insufficient-funds`,
  },
  
  INVALID_SIGNATURE: {
    code: 'INVALID_SIGNATURE',
    httpStatus: 400,
    category: 'blockchain',
    title: 'Invalid Signature',
    userMessage: 'Transaction signature is invalid. Please try again.',
    technicalDescription: 'The transaction signature is invalid or missing',
    retry: { retryable: true, suggestedDelayMs: 1000, maxRetries: 2 },
    typeUri: `${BASE_TYPE_URI}/invalid-signature`,
  },
  
  TRUSTLINE_MISSING: {
    code: 'TRUSTLINE_MISSING',
    httpStatus: 400,
    category: 'blockchain',
    title: 'Trustline Missing',
    userMessage: 'A required trustline is missing. Please add the trustline and try again.',
    technicalDescription: 'The account has not established a trustline for the asset',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/trustline-missing`,
  },
  
  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    httpStatus: 400,
    category: 'blockchain',
    title: 'Transaction Failed',
    userMessage: 'The transaction could not be completed. Please try again later.',
    technicalDescription: 'The transaction failed on the Stellar network',
    retry: { retryable: true, suggestedDelayMs: 2000, maxRetries: 2 },
    typeUri: `${BASE_TYPE_URI}/transaction-failed`,
  },
  
  TRANSACTION_TIMEOUT: {
    code: 'TRANSACTION_TIMEOUT',
    httpStatus: 504,
    category: 'blockchain',
    title: 'Transaction Timeout',
    userMessage: 'The transaction timed out. Please check your account history before retrying.',
    technicalDescription: 'The transaction submission timed out waiting for confirmation',
    retry: { retryable: true, suggestedDelayMs: 5000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/transaction-timeout`,
  },
  
  ACCOUNT_NOT_FOUND: {
    code: 'ACCOUNT_NOT_FOUND',
    httpStatus: 404,
    category: 'blockchain',
    title: 'Account Not Found',
    userMessage: 'The Stellar account could not be found.',
    technicalDescription: 'The requested Stellar account does not exist on the network',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/account-not-found`,
  },
  
  SEQUENCE_NUMBER_INVALID: {
    code: 'SEQUENCE_NUMBER_INVALID',
    httpStatus: 400,
    category: 'blockchain',
    title: 'Invalid Sequence Number',
    userMessage: 'Transaction sequence number is invalid. Please try again.',
    technicalDescription: 'The transaction sequence number is invalid or out of order',
    retry: { retryable: true, suggestedDelayMs: 500, maxRetries: 3 },
    typeUri: `${BASE_TYPE_URI}/sequence-number-invalid`,
  },
  
  // Stream Domain Errors
  STREAM_NOT_FOUND: {
    code: 'STREAM_NOT_FOUND',
    httpStatus: 404,
    category: 'client',
    title: 'Stream Not Found',
    userMessage: 'The payment stream could not be found.',
    technicalDescription: 'The requested payment stream does not exist',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/stream-not-found`,
  },
  
  INVALID_STREAM_STATE: {
    code: 'INVALID_STREAM_STATE',
    httpStatus: 409,
    category: 'client',
    title: 'Invalid Stream State',
    userMessage: 'This action cannot be performed on the current stream state.',
    technicalDescription: 'The requested action is not valid for the current stream state',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/invalid-stream-state`,
  },
  
  STREAM_CREATION_FAILED: {
    code: 'STREAM_CREATION_FAILED',
    httpStatus: 500,
    category: 'server',
    title: 'Stream Creation Failed',
    userMessage: 'We could not create the payment stream. Please try again later.',
    technicalDescription: 'Failed to create a new payment stream',
    retry: { retryable: true, suggestedDelayMs: 2000, maxRetries: 2 },
    typeUri: `${BASE_TYPE_URI}/stream-creation-failed`,
  },
  
  SETTLEMENT_FAILED: {
    code: 'SETTLEMENT_FAILED',
    httpStatus: 500,
    category: 'server',
    title: 'Settlement Failed',
    userMessage: 'The settlement could not be completed. Please try again later.',
    technicalDescription: 'Failed to settle the stream balance',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/settlement-failed`,
  },
  
  WITHDRAWAL_FAILED: {
    code: 'WITHDRAWAL_FAILED',
    httpStatus: 500,
    category: 'server',
    title: 'Withdrawal Failed',
    userMessage: 'The withdrawal could not be completed. Please try again later.',
    technicalDescription: 'Failed to process the withdrawal',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/withdrawal-failed`,
  },
  
  // Network Errors
  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    httpStatus: 0, // Network errors don't have HTTP status
    category: 'network',
    title: 'Network Timeout',
    userMessage: 'The connection timed out. Please check your internet connection and try again.',
    technicalDescription: 'The network request timed out',
    retry: { retryable: true, suggestedDelayMs: 2000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/network-timeout`,
  },
  
  NETWORK_UNAVAILABLE: {
    code: 'NETWORK_UNAVAILABLE',
    httpStatus: 0,
    category: 'network',
    title: 'Network Unavailable',
    userMessage: 'No internet connection detected. Please check your connection and try again.',
    technicalDescription: 'The network is unavailable or the device is offline',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 5, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/network-unavailable`,
  },
  
  DNS_LOOKUP_FAILED: {
    code: 'DNS_LOOKUP_FAILED',
    httpStatus: 0,
    category: 'network',
    title: 'DNS Lookup Failed',
    userMessage: 'Could not connect to the server. Please try again later.',
    technicalDescription: 'Failed to resolve the server hostname',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/dns-lookup-failed`,
  },
  
  CONNECTION_RESET: {
    code: 'CONNECTION_RESET',
    httpStatus: 0,
    category: 'network',
    title: 'Connection Reset',
    userMessage: 'The connection was interrupted. Please try again.',
    technicalDescription: 'The network connection was reset',
    retry: { retryable: true, suggestedDelayMs: 1000, maxRetries: 3 },
    typeUri: `${BASE_TYPE_URI}/connection-reset`,
  },
  
  // Idempotency Errors
  IDEMPOTENCY_KEY_REUSE: {
    code: 'IDEMPOTENCY_KEY_REUSE',
    httpStatus: 409,
    category: 'client',
    title: 'Idempotency Key Reuse',
    userMessage: 'This request is already being processed. Please wait a moment.',
    technicalDescription: 'The idempotency key has already been used for a different request',
    retry: { retryable: true, suggestedDelayMs: 2000, maxRetries: 5, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/idempotency-key-reuse`,
  },
  
  IDEMPOTENCY_CONFLICT: {
    code: 'IDEMPOTENCY_CONFLICT',
    httpStatus: 409,
    category: 'client',
    title: 'Idempotency Conflict',
    userMessage: 'This action is already being processed. Please refresh and try again.',
    technicalDescription: 'Conflict detected with idempotency key processing',
    retry: { retryable: true, suggestedDelayMs: 1000, maxRetries: 3 },
    typeUri: `${BASE_TYPE_URI}/idempotency-conflict`,
  },
  
  // Validation Errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    httpStatus: 422,
    category: 'validation',
    title: 'Validation Error',
    userMessage: 'Please check your input and try again.',
    technicalDescription: 'The request failed validation',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/validation-error`,
  },
  
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    httpStatus: 400,
    category: 'validation',
    title: 'Invalid Request',
    userMessage: 'The request format is invalid. Please check your input.',
    technicalDescription: 'The request is malformed or contains invalid data',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/invalid-request`,
  },
  
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    httpStatus: 422,
    category: 'validation',
    title: 'Missing Required Field',
    userMessage: 'Please fill in all required fields.',
    technicalDescription: 'One or more required fields are missing',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/missing-required-field`,
  },
  
  INVALID_FIELD_VALUE: {
    code: 'INVALID_FIELD_VALUE',
    httpStatus: 422,
    category: 'validation',
    title: 'Invalid Field Value',
    userMessage: 'One or more fields contain invalid values. Please check your input.',
    technicalDescription: 'A field value is invalid or out of range',
    retry: { retryable: false },
    typeUri: `${BASE_TYPE_URI}/invalid-field-value`,
  },
  
  // Catch-all
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    httpStatus: 500,
    category: 'unknown',
    title: 'Unknown Error',
    userMessage: 'An unexpected error occurred. Please try again later.',
    technicalDescription: 'An unrecognized error occurred',
    retry: { retryable: true, suggestedDelayMs: 3000, maxRetries: 3, useExponentialBackoff: true },
    typeUri: `${BASE_TYPE_URI}/unknown-error`,
  },
};

/**
 * Get error metadata by code
 */
export function getErrorMetadata(code: ErrorCode): ErrorCodeMetadata {
  return ERROR_REGISTRY[code] ?? ERROR_REGISTRY.UNKNOWN_ERROR;
}

/**
 * Check if an error code is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  return ERROR_REGISTRY[code]?.retry.retryable ?? false;
}

/**
 * Get retry guidance for an error code
 */
export function getRetryGuidance(code: ErrorCode): RetryGuidance {
  return ERROR_REGISTRY[code]?.retry ?? { retryable: false };
}

/**
 * Get user-friendly message for an error code
 */
export function getUserMessage(code: ErrorCode): string {
  return ERROR_REGISTRY[code]?.userMessage ?? ERROR_REGISTRY.UNKNOWN_ERROR.userMessage;
}

/**
 * Map HTTP status code to default error code
 */
export function getErrorCodeForHttpStatus(status: number): ErrorCode {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 405: return 'METHOD_NOT_ALLOWED';
    case 408: return 'REQUEST_TIMEOUT';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'RATE_LIMITED';
    case 500: return 'INTERNAL_ERROR';
    case 503: return 'SERVICE_UNAVAILABLE';
    case 504: return 'GATEWAY_TIMEOUT';
    default: return 'UNKNOWN_ERROR';
  }
}

/**
 * Stellar Horizon operation result code mapping
 */
export const HORIZON_ERROR_MAPPING: Record<string, ErrorCode> = {
  // Payment errors
  'op_underfunded': 'INSUFFICIENT_FUNDS',
  'op_over_source_max': 'INSUFFICIENT_FUNDS',
  
  // Auth errors
  'op_bad_auth': 'INVALID_SIGNATURE',
  'op_bad_auth_extra': 'INVALID_SIGNATURE',
  
  // Trustline errors
  'op_no_trust': 'TRUSTLINE_MISSING',
  'op_not_authorized': 'TRUSTLINE_MISSING',
  'op_line_full': 'TRANSACTION_FAILED',
  
  // Account errors
  'op_no_account': 'ACCOUNT_NOT_FOUND',
  'op_no_destination': 'ACCOUNT_NOT_FOUND',
  'op_src_no_trust': 'TRUSTLINE_MISSING',
  'op_src_not_authorized': 'TRUSTLINE_MISSING',
  
  // Transaction errors
  'tx_bad_auth': 'INVALID_SIGNATURE',
  'tx_bad_auth_extra': 'INVALID_SIGNATURE',
  'tx_bad_seq': 'SEQUENCE_NUMBER_INVALID',
  'tx_failed': 'TRANSACTION_FAILED',
  'tx_insufficient_balance': 'INSUFFICIENT_FUNDS',
  'tx_insufficient_fee': 'INSUFFICIENT_FUNDS',
  'tx_missing_operation': 'INVALID_REQUEST',
  'tx_timeout': 'TRANSACTION_TIMEOUT',
  
  // Offer errors (payment streaming might encounter)
  'op_cross_self': 'TRANSACTION_FAILED',
  'op_offer_not_found': 'NOT_FOUND',
  'op_too_many_signers': 'INVALID_REQUEST',
};

/**
 * Backend error code mapping (from API responses to frontend codes)
 */
export const BACKEND_ERROR_CODE_MAPPING: Record<string, ErrorCode> = {
  // Validation errors
  'VALIDATION_ERROR': 'VALIDATION_ERROR',
  'INVALID_REQUEST': 'INVALID_REQUEST',
  'MISSING_REQUIRED_FIELD': 'MISSING_REQUIRED_FIELD',
  'INVALID_FIELD_VALUE': 'INVALID_FIELD_VALUE',
  
  // Auth errors
  'UNAUTHORIZED': 'UNAUTHORIZED',
  'FORBIDDEN': 'FORBIDDEN',
  'AUTH_TOKEN_EXPIRED': 'UNAUTHORIZED',
  'INVALID_TOKEN': 'UNAUTHORIZED',
  
  // Resource errors
  'STREAM_NOT_FOUND': 'STREAM_NOT_FOUND',
  'RESOURCE_NOT_FOUND': 'NOT_FOUND',
  
  // State errors
  'INVALID_STREAM_STATE': 'INVALID_STREAM_STATE',
  'STREAM_INACTIVE_STATE': 'INVALID_STREAM_STATE',
  'CONFLICT': 'CONFLICT',
  
  // Idempotency errors
  'IDEMPOTENCY_KEY_REUSE': 'IDEMPOTENCY_KEY_REUSE',
  'IDEMPOTENCY_CONFLICT': 'IDEMPOTENCY_CONFLICT',
  
  // Processing errors
  'STREAM_CREATION_FAILED': 'STREAM_CREATION_FAILED',
  'SETTLEMENT_FAILED': 'SETTLEMENT_FAILED',
  'WITHDRAWAL_FAILED': 'WITHDRAWAL_FAILED',
  'INTERNAL_ERROR': 'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE': 'SERVICE_UNAVAILABLE',
};
