import { useEffect, useRef, type ReactNode } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

interface HighlighterProps {
  children: ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  className?: string;
}

/**
 * Adapted from https://magicui.design/docs/components/highlighter — the MagicUI version
 * draws its rough-notation annotation on mount/scroll-into-view. This variant draws it
 * on hover instead, so it can be used as a hover accent on nav links and CTAs.
 */
export function Highlighter({
  children,
  action = "highlight",
  color = "#3b82f6",
  strokeWidth = 2.5,
  animationDuration = 350,
  iterations = 1,
  padding = 5,
  multiline = true,
  className = "",
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const annotation = annotate(element, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    });
    annotationRef.current = annotation;

    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
  }, [action, color, strokeWidth, animationDuration, iterations, padding, multiline]);

  return (
    <span
      ref={elementRef}
      onMouseEnter={() => annotationRef.current?.show()}
      onMouseLeave={() => annotationRef.current?.hide()}
      className={`relative inline-block bg-transparent ${className}`}
    >
      {children}
    </span>
  );
}
