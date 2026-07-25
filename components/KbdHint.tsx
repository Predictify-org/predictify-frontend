import React from "react";

export interface KbdHintProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * Visual keyboard shortcut hint. Hidden from the accessibility tree so
 * interactive controls keep a clean accessible name (WCAG 2.1 SC 4.1.2).
 */
const KbdHint: React.FC<KbdHintProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <kbd
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
};

export default KbdHint;
