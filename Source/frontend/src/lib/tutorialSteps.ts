export type TutorialPlacement = "top" | "bottom" | "left" | "right";

export interface TutorialStepState {
  tutorialNoteId: string | null;
  tutorialCardId: string | null;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  placement: TutorialPlacement;
  /** CSS selector for the element to spotlight, or null while the target doesn't exist yet. */
  getTargetSelector: (state: TutorialStepState) => string | null;
  /** When set, clicking Next (without the user already having done this themselves) runs this registered action. */
  actionKey?: "create-board" | "add-note" | "add-card" | "link-cards";
  /** When true, no Next button is shown — the user must actually complete this step (e.g. typing a title) to advance. */
  hideNext?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "create-board",
    title: "Create your first board",
    body: "Boards are your cork board — sticky notes, index cards, and more, all pinned in one place. Click New Board to create one, or just click Next.",
    placement: "bottom",
    getTargetSelector: () => '[data-tutorial-target="new-board-button"]',
    actionKey: "create-board",
  },
  {
    id: "board-title",
    title: "Give it a name",
    body: "Type a name for your board, then click Create Board.",
    placement: "right",
    getTargetSelector: () => '[data-tutorial-target="create-board-dialog"]',
    hideNext: true,
  },
  {
    id: "add-note",
    title: "Add a sticky note",
    body: "Click the Sticky Note tool in the sidebar — or drag it onto your board — to add a note. Or just click Next.",
    placement: "right",
    getTargetSelector: () => '[data-tutorial-target="sidebar-sticky-note-tool"]',
    actionKey: "add-note",
  },
  {
    id: "note-created",
    title: "Here's your note",
    body: "It's already selected and ready to edit.",
    placement: "right",
    // Targets the note's inner panel (not the outer `data-note-id` wrapper) since that's the
    // element the "enlarge while editing" scale transform is actually applied to — the outer
    // wrapper's own box never grows, so highlighting it would produce an undersized ring.
    getTargetSelector: (state) =>
      state.tutorialNoteId ? `[data-note-panel="${state.tutorialNoteId}"]` : null,
  },
  {
    id: "edit-note",
    title: "Write your note",
    body: "Type a title and content here.",
    placement: "top",
    getTargetSelector: (state) =>
      state.tutorialNoteId ? `[data-note-id="${state.tutorialNoteId}"] [data-field="content"]` : null,
  },
  {
    id: "format-text",
    title: "Format your text",
    body: "Use this toolbar to bold, color, align, or link your text — or delete the note entirely. Click outside the note when you're done.",
    placement: "bottom",
    getTargetSelector: () => '[data-tutorial-target="note-formatting-toolbar"]',
  },
  {
    id: "add-card",
    title: "Add an index card",
    body: "Click the Index Card tool in the sidebar — or drag it onto your board — to add one. Or just click Next.",
    placement: "right",
    getTargetSelector: () => '[data-tutorial-target="sidebar-index-card-tool"]',
    actionKey: "add-card",
  },
  {
    id: "card-created",
    title: "Here's your index card",
    body: "Index cards are great for longer notes, quotes, or research — and just like sticky notes, they can be linked to other items.",
    placement: "right",
    getTargetSelector: (state) =>
      state.tutorialCardId ? `[data-card-panel="${state.tutorialCardId}"]` : null,
  },
  {
    id: "link-cards",
    title: "Connect them with a red string",
    body: "Click and drag from this pin to the index card's pin to link the two together — just like a detective's cork board. Or just click Next.",
    placement: "top",
    getTargetSelector: (state) =>
      state.tutorialNoteId ? `[data-pin-note-id="${state.tutorialNoteId}"]` : null,
    actionKey: "link-cards",
  },
];
