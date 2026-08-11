import { forwardRef, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface TutorialTooltipProps {
  title: string;
  body: string;
  stepNumber: number;
  totalSteps: number;
  showBack: boolean;
  isLast: boolean;
  hideNext?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const TutorialTooltip = forwardRef<HTMLDivElement, TutorialTooltipProps>(
  function TutorialTooltip(
    { title, body, stepNumber, totalSteps, showBack, isLast, hideNext, onNext, onBack, onSkip },
    ref,
  ) {
    const nextButtonRef = useRef<HTMLButtonElement>(null);
    const backButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const timer = setTimeout(() => {
        (hideNext ? backButtonRef.current : nextButtonRef.current)?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }, [stepNumber, hideNext]);

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className="pointer-events-auto fixed z-[201] w-[min(320px,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-2xl"
        style={{ left: 0, top: 0 }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-foreground/50">
            Step {stepNumber} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tutorial"
            className="-mr-1 -mt-1 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-foreground/70">{body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-foreground/50 transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                ref={backButtonRef}
                type="button"
                onClick={onBack}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Back
              </button>
            )}
            {!hideNext && (
              <button
                ref={nextButtonRef}
                type="button"
                onClick={onNext}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {isLast ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
