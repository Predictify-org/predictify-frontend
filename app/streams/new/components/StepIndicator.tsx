"use client";

import React from "react";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className = "" }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={`step-indicator ${className}`.trim()}>
      <ol className="step-indicator__list">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          const stateClass = isCompleted ? "completed" : isCurrent ? "current" : "upcoming";

          return (
            <li
              key={step.id}
              className={`step-indicator__step step-indicator__step--${stateClass}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="step-indicator__marker" aria-hidden="true">
                {isCompleted ? (
                  <svg
                    className="step-indicator__check"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="step-indicator__number">{index + 1}</span>
                )}
              </div>

              <div className="step-indicator__content">
                <span className="step-indicator__label">{step.label}</span>
                {step.description && (
                  <span className="step-indicator__desc">{step.description}</span>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className="step-indicator__connector" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
