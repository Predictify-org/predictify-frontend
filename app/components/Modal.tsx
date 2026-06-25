"use client";

import React, {
  KeyboardEvent,
  PropsWithChildren,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const Modal: React.FC<PropsWithChildren<ModalProps>> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
      return;
    }

    previouslyFocusedElementRef.current?.focus();
    previouslyFocusedElementRef.current = null;
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  // Keep keyboard focus inside the active dialog per WAI-ARIA dialog guidance.
  const getFocusableElements = () => {
    if (!dialogRef.current) return [];

    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        [
          "a[href]",
          "button:not([disabled])",
          "textarea:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter(
      (element) =>
        !element.hasAttribute("hidden") &&
        element.getAttribute("aria-hidden") !== "true"
    );
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (
        activeElement === firstFocusableElement ||
        !dialogRef.current?.contains(activeElement)
      ) {
        event.preventDefault();
        lastFocusableElement.focus();
      }
      return;
    }

    if (
      activeElement === lastFocusableElement ||
      !dialogRef.current?.contains(activeElement)
    ) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 1000,
        animation: `${isOpen ? "fadeIn" : "fadeOut"} var(--motion-duration-medium) var(--motion-easing) forwards`,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "var(--card-surface)",
          border: "1px solid var(--card-border)",
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          animation: `${isOpen ? "scaleIn" : "scaleOut"} var(--motion-duration-medium) var(--motion-easing) forwards`,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 id={titleId} style={{ fontSize: "1.25rem" }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "1.5rem",
            }}
          >
            ×
          </button>
        </header>
        {children}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
