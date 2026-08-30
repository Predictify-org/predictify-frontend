"use client";

import { useEffect } from "react";
import {
  CURRENT_USER_ID,
  useNotificationsStore,
} from "@/app/state/notifications";
import { NotificationStream } from "@/lib/notification-stream";

/** Starts the optional SSE transport without changing the mock-data fallback. */
export function NotificationStreamConnector() {
  const upsertNotification = useNotificationsStore(
    (state) => state.upsertNotification
  );
  const streamUrl = process.env.NEXT_PUBLIC_NOTIFICATION_STREAM_URL;

  useEffect(() => {
    if (!streamUrl) return;

    let stream: NotificationStream;
    try {
      stream = new NotificationStream({
        url: streamUrl,
        expectedUserId: CURRENT_USER_ID,
        onNotification: upsertNotification,
      });
      stream.start();
    } catch {
      // Do not log the configured URL: it may contain deployment-specific data.
      console.error("Notification stream configuration is invalid");
      return;
    }

    return () => stream.stop();
  }, [streamUrl, upsertNotification]);

  return null;
}
