"use client";

import { useEffect, useRef } from "react";
import { onboardingCopy } from "../content/copy";

interface StreamPrimerProps {
  onClose: () => void;
}

export const StreamPrimer = ({ onClose }: StreamPrimerProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus management: focus the close button when opened
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="primer-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        padding: "1rem",
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "var(--panel-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "1.5rem",
          maxWidth: "40rem",
          width: "100%",
          padding: "2.5rem",
          boxShadow: "var(--shadow-soft)",
          position: "relative",
          animation: "modalFadeIn 0.3s ease-out",
        }}
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close onboarding"
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "1.5rem",
            lineHeight: 1,
            padding: "0.5rem",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          ×
        </button>

        <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            id="primer-title"
            style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--foreground)" }}
          >
            {onboardingCopy.title}
          </h1>
          <p style={{ color: "var(--muted-light)", fontSize: "1.1rem" }}>{onboardingCopy.subtitle}</p>
        </header>

        <div style={{ display: "grid", gap: "2rem" }}>
          {onboardingCopy.steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: "flex",
                gap: "1.25rem",
                alignItems: "flex-start",
                animation: `stepFadeIn 0.5s ease-out ${index * 0.1}s both`,
              }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "1rem",
                  background: step.id === "stream" ? "rgba(34, 197, 94, 0.15)" : 
                              step.id === "settle" ? "rgba(59, 130, 246, 0.15)" : 
                              "rgba(245, 158, 11, 0.15)",
                  border: `1px solid ${step.id === "stream" ? "var(--accent)" : 
                                       step.id === "settle" ? "var(--info)" : 
                                       "var(--warning)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: step.id === "stream" ? "var(--accent)" : 
                         step.id === "settle" ? "var(--info)" : 
                         "var(--warning)",
                }}
              >
                {index + 1}
              </div>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--foreground)" }}>
                  {step.title}
                </h2>
                <p style={{ color: "var(--muted-light)", lineHeight: 1.5, fontSize: "0.95rem" }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: "3rem", display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--accent)",
              color: "#03150a",
              padding: "0.875rem 2.5rem",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s, background 0.2s",
              boxShadow: "0 10px 15px -3px rgba(34, 197, 94, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {onboardingCopy.cta}
          </button>
        </footer>

        <style jsx>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes stepFadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
};
