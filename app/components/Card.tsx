"use client";

import React, { PropsWithChildren } from "react";

interface CardProps {
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const paddingStyles = {
  none: "0",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
};

export const Card: React.FC<PropsWithChildren<CardProps>> = ({
  children,
  padding = "md",
  onClick,
  className = "",
}) => {
  const isClickable = !!onClick;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`card ${isClickable ? "card--clickable" : ""} ${className}`}
      style={{
        padding: paddingStyles[padding],
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as any);
        }
      } : undefined}
    >
      {children}
    </div>
  );
};
