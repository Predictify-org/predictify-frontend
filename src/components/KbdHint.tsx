import React from 'react';

export interface KbdHintProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const KbdHint: React.FC<KbdHintProps> = ({ children, className = '', ...props }) => {
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
