"use client";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export default function ProgressSteps({
  steps,
  currentStep,
  className = "",
}: ProgressStepsProps) {
  return (
    <div className={`flex items-center gap-2 mb-5 ${className}`}>
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            {/* Step indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isComplete
                    ? "bg-accent-positive text-white"
                    : isActive
                      ? "bg-accent-info text-white ring-2 ring-accent-info/30"
                      : "bg-surface-hover text-t-muted"
                }`}
              >
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-caption truncate ${
                  isActive ? "text-t-primary font-semibold" : isComplete ? "text-t-secondary" : "text-t-muted"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 rounded-full mx-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isComplete ? "bg-accent-positive" : "bg-surface-hover"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
