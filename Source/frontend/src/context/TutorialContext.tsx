/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TUTORIAL_STEPS, type TutorialStep } from "../lib/tutorialSteps";
import { usePreferences } from "./PreferencesContext";
import { useThemeContext, type ThemeMode } from "./ThemeContext";
import { updatePreferences } from "../api/users";

export type TutorialActionKey = "create-board" | "add-note" | "add-card" | "link-cards";

interface TutorialContextValue {
  isActive: boolean;
  stepIndex: number;
  totalSteps: number;
  currentStep: TutorialStep | null;
  tutorialNoteId: string | null;
  tutorialCardId: string | null;
  start: () => void;
  skip: () => void;
  complete: () => void;
  goToStep: (index: number) => void;
  advanceStep: () => void;
  retreatStep: () => void;
  registerAction: (key: TutorialActionKey, fn: () => unknown) => () => void;
  runAction: (key: TutorialActionKey) => Promise<void>;
  noteCreated: (noteId: string) => void;
  cardCreated: (cardId: string) => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

function themeToBackend(mode: ThemeMode): string {
  if (mode === "system") return "System";
  return mode === "light" ? "Light" : "Dark";
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { refetch } = usePreferences();
  const { themeMode } = useThemeContext();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tutorialNoteId, setTutorialNoteId] = useState<string | null>(null);
  const [tutorialCardId, setTutorialCardId] = useState<string | null>(null);
  const actionsRef = useRef<Partial<Record<TutorialActionKey, () => unknown>>>({});

  const start = useCallback(() => {
    setTutorialNoteId(null);
    setTutorialCardId(null);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsActive(false);
    void (async () => {
      try {
        await updatePreferences({ theme: themeToBackend(themeMode), hasCompletedTutorial: true });
        await refetch();
      } catch {
        // Best-effort — the tour simply won't reappear automatically until this succeeds.
      }
    })();
  }, [themeMode, refetch]);

  const registerAction = useCallback((key: TutorialActionKey, fn: () => unknown) => {
    actionsRef.current[key] = fn;
    return () => {
      if (actionsRef.current[key] === fn) delete actionsRef.current[key];
    };
  }, []);

  const runAction = useCallback(async (key: TutorialActionKey) => {
    await actionsRef.current[key]?.();
  }, []);

  const advanceStep = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, TUTORIAL_STEPS.length - 1));
  }, []);

  const retreatStep = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const noteCreated = useCallback(
    (noteId: string) => {
      setTutorialNoteId(noteId);
      advanceStep();
    },
    [advanceStep],
  );

  const cardCreated = useCallback(
    (cardId: string) => {
      setTutorialCardId(cardId);
      advanceStep();
    },
    [advanceStep],
  );

  const goToStep = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(index, TUTORIAL_STEPS.length - 1)));
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({
      isActive,
      stepIndex,
      totalSteps: TUTORIAL_STEPS.length,
      currentStep: isActive ? TUTORIAL_STEPS[stepIndex] ?? null : null,
      tutorialNoteId,
      tutorialCardId,
      start,
      skip: dismiss,
      complete: dismiss,
      goToStep,
      advanceStep,
      retreatStep,
      registerAction,
      runAction,
      noteCreated,
      cardCreated,
    }),
    [
      isActive,
      stepIndex,
      tutorialNoteId,
      tutorialCardId,
      start,
      dismiss,
      goToStep,
      advanceStep,
      retreatStep,
      registerAction,
      runAction,
      noteCreated,
      cardCreated,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}
