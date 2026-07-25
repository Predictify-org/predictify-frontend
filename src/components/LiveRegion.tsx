import * as React from "react";

interface LiveRegionProps {
  message: string;
}

export function LiveRegion({ message }: LiveRegionProps) {
  const [announced, setAnnounced] = React.useState("");

  React.useEffect(() => {
    if (!message) return;
    setAnnounced("");
    const id = setTimeout(() => setAnnounced(message), 50);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announced}
    </div>
  );
}
