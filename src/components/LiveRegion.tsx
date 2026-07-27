"use client";

import * as React from "react";

interface LiveRegionProps {
  message: string;
  "data-testid"?: string;
}

/**
 * Invisible ARIA live region for screen-reader announcements.
 * Uses aria-live="polite" to announce updates without interrupting the user.
 */
export function LiveRegion({ message, "data-testid": dataTestId }: LiveRegionProps) {
  const [announced, setAnnounced] = React.useState("");

  React.useEffect(() => {
    if (!message) return;
    setAnnounced("");
    const id = setTimeout(() => setAnnounced(message), 50);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid={dataTestId}
      className="sr-only"
    >
      {announced}
    </div>
  );
}
