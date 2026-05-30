import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConfig, type ValidatedConfig } from "@/app/lib/config";

export const INTERNAL_AUTH_HEADERS = {
  bodySha256: "x-streampay-content-sha256",
  keyId: "x-streampay-key-id",
  serviceName: "x-streampay-service-name",
  signature: "x-streampay-signature",
  timestamp: "x-streampay-timestamp",
} as const;

type InternalServiceAuthSettings = NonNullable<ValidatedConfig["internalServiceAuth"]>;

type VerificationFailureCode =
  | "MISSING_SIGNATURE"
  | "UNKNOWN_KEY"
  | "BAD_TIMESTAMP"
  | "STALE_TIMESTAMP"
  | "BAD_CONTENT_HASH"
  | "BAD_SIGNATURE"
  | "SERVICE_NOT_ALLOWED"
  | "MISCONFIGURED";

type VerificationSuccess = {
  ok: true;
  identity: {
    bodySha256: string;
    keyId: string;
    serviceName: string;
    timestamp: string;
  };
};

type VerificationFailure = {
  ok: false;
  code: VerificationFailureCode;
  message: string;
  status: 401 | 403 | 503;
};

export type InternalServiceVerificationResult = VerificationSuccess | VerificationFailure;

type SignRequestInput = {
  body?: string;
  keyId: string;
  method: string;
  secret: string;
  serviceName: string;
  timestampMs?: number;
  url: string;
};

type RequireInternalServiceAuthOptions = {
  allowedServices?: string[];
  concealFailure?: boolean;
  config?: InternalServiceAuthSettings;
  now?: Date;
};

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: "mock-request-id",
      },
    },
    { status }
  );
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildCanonicalRequest(input: {
  bodySha256: string;
  keyId: string;
  method: string;
  serviceName: string;
  timestampMs: number;
  url: string;
}) {
  const { pathname, search } = new URL(input.url);
  return [
    "streampay-hmac-v1",
    input.method.toUpperCase(),
    `${pathname}${search}`,
    input.serviceName,
    input.keyId,
    String(input.timestampMs),
    input.bodySha256,
  ].join("\n");
}

function signCanonicalRequest(canonicalRequest: string, secret: string): string {
  return createHmac("sha256", secret).update(canonicalRequest).digest("hex");
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSignatureHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("v1=")) {
    return value.slice(3);
  }

  return null;
}

function parseTimestampMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestampMs = Number(value);
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return null;
  }

  return timestampMs;
}

function getInternalAuthSettings(config?: InternalServiceAuthSettings): InternalServiceAuthSettings | null {
  return config ?? getConfig().internalServiceAuth ?? null;
}

export function createInternalServiceRequestHeaders(input: SignRequestInput): Record<string, string> {
  const timestampMs = input.timestampMs ?? Date.now();
  const body = input.body ?? "";
  const bodySha256 = sha256Hex(body);
  const canonicalRequest = buildCanonicalRequest({
    bodySha256,
    keyId: input.keyId,
    method: input.method,
    serviceName: input.serviceName,
    timestampMs,
    url: input.url,
  });

  return {
    [INTERNAL_AUTH_HEADERS.bodySha256]: bodySha256,
    [INTERNAL_AUTH_HEADERS.keyId]: input.keyId,
    [INTERNAL_AUTH_HEADERS.serviceName]: input.serviceName,
    [INTERNAL_AUTH_HEADERS.signature]: `v1=${signCanonicalRequest(canonicalRequest, input.secret)}`,
    [INTERNAL_AUTH_HEADERS.timestamp]: String(timestampMs),
  };
}

export async function verifyInternalServiceRequest(
  request: Request,
  options: Omit<RequireInternalServiceAuthOptions, "concealFailure"> = {}
): Promise<InternalServiceVerificationResult> {
  const settings = getInternalAuthSettings(options.config);
  if (!settings) {
    return {
      ok: false,
      code: "MISCONFIGURED",
      message: "Internal service auth is not configured for this deployment.",
      status: 503,
    };
  }

  const serviceName = request.headers.get(INTERNAL_AUTH_HEADERS.serviceName);
  const keyId = request.headers.get(INTERNAL_AUTH_HEADERS.keyId);
  const signature = parseSignatureHeader(request.headers.get(INTERNAL_AUTH_HEADERS.signature));
  const timestampMs = parseTimestampMs(request.headers.get(INTERNAL_AUTH_HEADERS.timestamp));

  if (!serviceName || !keyId || !signature || timestampMs === null) {
    return {
      ok: false,
      code: "MISSING_SIGNATURE",
      message: "Signed service-to-service authentication headers are required.",
      status: 401,
    };
  }

  if (options.allowedServices && !options.allowedServices.includes(serviceName)) {
    return {
      ok: false,
      code: "SERVICE_NOT_ALLOWED",
      message: `Service '${serviceName}' is not allowed to call this route.`,
      status: 403,
    };
  }

  const secret = settings.keys[keyId];
  if (!secret) {
    return {
      ok: false,
      code: "UNKNOWN_KEY",
      message: `Unknown internal service key id '${keyId}'.`,
      status: 401,
    };
  }

  const now = options.now ?? new Date();
  const deltaMs = Math.abs(now.getTime() - timestampMs);
  if (deltaMs > settings.allowedClockSkewSeconds * 1000) {
    return {
      ok: false,
      code: "STALE_TIMESTAMP",
      message: "Internal request signature is outside the allowed freshness window.",
      status: 401,
    };
  }

  const requestBody = await request.clone().text();
  const computedBodySha256 = sha256Hex(requestBody);
  const declaredBodySha256 = request.headers.get(INTERNAL_AUTH_HEADERS.bodySha256);

  if (!declaredBodySha256 || !signaturesMatch(declaredBodySha256, computedBodySha256)) {
    return {
      ok: false,
      code: "BAD_CONTENT_HASH",
      message: "Internal request body hash did not match the signed payload.",
      status: 401,
    };
  }

  const expectedSignature = signCanonicalRequest(
    buildCanonicalRequest({
      bodySha256: computedBodySha256,
      keyId,
      method: request.method,
      serviceName,
      timestampMs,
      url: request.url,
    }),
    secret
  );

  if (!signaturesMatch(signature, expectedSignature)) {
    return {
      ok: false,
      code: "BAD_SIGNATURE",
      message: "Internal request signature verification failed.",
      status: 401,
    };
  }

  return {
    ok: true,
    identity: {
      bodySha256: computedBodySha256,
      keyId,
      serviceName,
      timestamp: new Date(timestampMs).toISOString(),
    },
  };
}

export async function requireInternalServiceAuth(
  request: Request,
  options: RequireInternalServiceAuthOptions = {}
): Promise<VerificationSuccess["identity"] | NextResponse> {
  const verification = await verifyInternalServiceRequest(request, options);
  if (verification.ok) {
    return verification.identity;
  }

  if (options.concealFailure) {
    return createErrorResponse("ROUTE_NOT_FOUND", "Route not found", 404);
  }

  if (verification.code === "MISCONFIGURED") {
    return createErrorResponse("INTERNAL_AUTH_MISCONFIGURED", verification.message, verification.status);
  }

  return createErrorResponse("INTERNAL_AUTH_REQUIRED", verification.message, verification.status);
}
