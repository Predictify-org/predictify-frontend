/**
 * GET  /api/notifications/preferences  - Get notification preferences for authenticated user
 * PUT  /api/notifications/preferences  - Update notification preferences
 */

import { NextResponse } from "next/server";

interface NotificationPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  webhook: boolean;
  events: {
    streamCreated: boolean;
    streamCompleted: boolean;
    streamCancelled: boolean;
    paymentFailed: boolean;
    lowBalance: boolean;
  };
  updatedAt: string;
}

const prefsStore = new Map<string, NotificationPreferences>();

const DEFAULT_PREFS: Omit<NotificationPreferences, "userId" | "updatedAt"> = {
  email: true,
  inApp: true,
  webhook: false,
  events: {
    streamCreated: true,
    streamCompleted: true,
    streamCancelled: true,
    paymentFailed: true,
    lowBalance: false,
  },
};

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? "anonymous";
}

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  const prefs = prefsStore.get(userId) ?? {
    userId,
    ...DEFAULT_PREFS,
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request: Request) {
  const userId = getUserId(request);

  let body: Partial<Omit<NotificationPreferences, "userId" | "updatedAt">>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const existing = prefsStore.get(userId) ?? { userId, ...DEFAULT_PREFS, updatedAt: "" };

  const updated: NotificationPreferences = {
    ...existing,
    email: body.email ?? existing.email,
    inApp: body.inApp ?? existing.inApp,
    webhook: body.webhook ?? existing.webhook,
    events: {
      ...existing.events,
      ...(body.events ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  prefsStore.set(userId, updated);
  return NextResponse.json({ preferences: updated });
}
