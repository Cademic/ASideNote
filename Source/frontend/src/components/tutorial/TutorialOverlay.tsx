import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { useTutorial } from "../../context/TutorialContext";
import { useTutorialTarget } from "../../hooks/useTutorialTarget";
import { TUTORIAL_STEPS } from "../../lib/tutorialSteps";
import { TutorialTooltip } from "./TutorialTooltip";

const HIGHLIGHT_PADDING = 4;

export function TutorialOverlay() {
  const tutorial = useTutorial();
  const navigate = useNavigate();
  const step = tutorial.currentStep;
  const selector = step
    ? step.getTargetSelector({
        tutorialNoteId: tutorial.tutorialNoteId,
        tutorialCardId: tutorial.tutorialCardId,
      })
    : null;
  const targetEl = useTutorialTarget(selector);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetEl || !tooltipRef.current || !step) {
      setRect(null);
      return;
    }
    const tooltipEl = tooltipRef.current;

    function update() {
      if (!targetEl) return;
      setRect(targetEl.getBoundingClientRect());
      computePosition(targetEl, tooltipEl, {
        placement: step!.placement,
        middleware: [offset(14), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(tooltipEl.style, { left: `${x}px`, top: `${y}px` });
      });
    }

    return autoUpdate(targetEl, tooltipEl, update, { animationFrame: true });
  }, [targetEl, step]);

  useEffect(() => {
    if (!tutorial.isActive) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") tutorial.skip();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tutorial]);

  const handleNext = useCallback(async () => {
    if (!step) return;
    // Action-gated steps run their fallback action first — the action itself is
    // responsible for advancing (or, on the final step, completing) the tour once done.
    if (step.actionKey) {
      await tutorial.runAction(step.actionKey);
      return;
    }
    const isLast = tutorial.stepIndex === tutorial.totalSteps - 1;
    if (isLast) {
      tutorial.complete();
      return;
    }
    tutorial.goToStep(tutorial.stepIndex + 1);
  }, [step, tutorial]);

  const handleBack = useCallback(() => {
    let newIndex = tutorial.stepIndex - 1;
    // "board-title" only makes sense while the create-board dialog is actually open —
    // skip over it going back, since by then a board (if any) already exists.
    if (TUTORIAL_STEPS[newIndex]?.id === "board-title") newIndex -= 1;
    if (newIndex < 0) return;
    if (newIndex === 0) navigate("/boards");
    tutorial.goToStep(newIndex);
  }, [tutorial, navigate]);

  if (!tutorial.isActive || !step) return null;

  return createPortal(
    <div data-tutorial-overlay className="pointer-events-none fixed inset-0 z-[200]" aria-live="polite">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-md ring-2 ring-primary transition-[top,left,width,height] duration-150 ease-out-smooth motion-reduce:transition-none"
          style={{
            left: rect.left - HIGHLIGHT_PADDING,
            top: rect.top - HIGHLIGHT_PADDING,
            width: rect.width + HIGHLIGHT_PADDING * 2,
            height: rect.height + HIGHLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/40" />
      )}
      <TutorialTooltip
        ref={tooltipRef}
        title={step.title}
        body={step.body}
        stepNumber={tutorial.stepIndex + 1}
        totalSteps={tutorial.totalSteps}
        showBack={tutorial.stepIndex > 0}
        isLast={tutorial.stepIndex === tutorial.totalSteps - 1}
        hideNext={step.hideNext}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={tutorial.skip}
      />
    </div>,
    document.body,
  );
}
