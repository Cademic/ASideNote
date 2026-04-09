import { useState } from "react";
import { X, ClipboardList, PenTool, FolderOpen, BookOpen } from "lucide-react";

const PROJECT_COLORS = [
  { value: "violet", label: "Violet", bg: "bg-violet-400", ring: "ring-violet-500" },
  { value: "sky", label: "Sky", bg: "bg-sky-400", ring: "ring-sky-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-400", ring: "ring-amber-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-400", ring: "ring-rose-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-400", ring: "ring-emerald-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-400", ring: "ring-orange-500" },
];

type DialogTab = "board" | "project" | "notebook";

interface CreateBoardDialogProps {
  isOpen: boolean;
  error?: string | null;
  createNotebookError?: string | null;
  canCreateNotebook?: boolean;
  onClose: () => void;
  onCreateBoard: (name: string, description: string, boardType: string) => void;
  onCreateProject: (
    name: string,
    description: string,
    color: string,
    startDate?: string,
    endDate?: string,
    deadline?: string,
  ) => void;
  onCreateNotebook?: (name: string) => void;
  defaultBoardType?: string;
}

const BOARD_TYPES = [
  { value: "NoteBoard", label: "Note Board", icon: ClipboardList, description: "Pin sticky notes and index cards" },
  { value: "ChalkBoard", label: "Chalk Board", icon: PenTool, description: "Freehand drawing canvas" },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CreateBoardDialog({
  isOpen,
  error,
  createNotebookError,
  canCreateNotebook = true,
  onClose,
  onCreateBoard,
  onCreateProject,
  onCreateNotebook,
  defaultBoardType = "NoteBoard",
}: CreateBoardDialogProps) {
  const [tab, setTab] = useState<DialogTab>("board");

  // Board fields
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [boardType, setBoardType] = useState(defaultBoardType);

  // Project fields
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState("violet");
  const [hasTimeConstraints, setHasTimeConstraints] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(nextMonthStr());
  const [deadline, setDeadline] = useState("");

  // Notebook fields
  const [notebookName, setNotebookName] = useState("");

  function resetFields() {
    setTab("board");
    setBoardName("");
    setBoardDescription("");
    setBoardType(defaultBoardType);
    setProjectName("");
    setProjectDescription("");
    setProjectColor("violet");
    setHasTimeConstraints(false);
    setStartDate(todayStr());
    setEndDate(nextMonthStr());
    setDeadline("");
    setNotebookName("");
  }

  function handleClose() {
    resetFields();
    onClose();
  }

  function handleSubmitBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) return;
    onCreateBoard(boardName.trim(), boardDescription.trim(), boardType);
  }

  function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;
    if (hasTimeConstraints && (!startDate || !endDate)) return;
    onCreateProject(
      projectName.trim(),
      projectDescription.trim(),
      projectColor,
      hasTimeConstraints ? startDate : undefined,
      hasTimeConstraints ? endDate : undefined,
      hasTimeConstraints && deadline ? deadline : undefined,
    );
  }

  function handleSubmitNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!notebookName.trim() || !onCreateNotebook) return;
    onCreateNotebook(notebookName.trim());
  }

  if (!isOpen) return null;

  const displayError = tab === "notebook" ? createNotebookError : error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-enter motion-reduce:animate-none"
        onClick={handleClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-border shadow-2xl p-6 mx-4 animate-dialog-enter motion-reduce:animate-none">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-foreground/50 hover:text-foreground hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-foreground mb-4">Get Started</h2>

        {/* Tab switcher */}
        <div className="mb-4 flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("board")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === "board"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground/50 hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            Board
          </button>
          <button
            type="button"
            onClick={() => setTab("project")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === "project"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground/50 hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            Project
          </button>
          {onCreateNotebook && (
            <button
              type="button"
              onClick={() => setTab("notebook")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === "notebook"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground/50 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              Notebook
            </button>
          )}
        </div>

        {/* Error message */}
        {displayError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            {displayError}
          </div>
        )}

        {/* ─── Board Tab ─────────────────────────── */}
        {tab === "board" && (
          <form onSubmit={handleSubmitBoard} className="flex flex-col gap-4">
            {/* Board type selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60">Board Type</label>
              <div className="grid grid-cols-2 gap-2">
                {BOARD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setBoardType(type.value)}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-[transform,colors,box-shadow] duration-150 ease-spring motion-reduce:transition-none",
                      boardType === type.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground/60 hover:border-foreground/30",
                    ].join(" ")}
                  >
                    <type.icon className="h-5 w-5" />
                    <span className="font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="board-name" className="mb-1.5 block text-xs font-medium text-foreground/60">
                Name
              </label>
              <input
                id="board-name"
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="My Note Board"
                maxLength={100}
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="board-desc" className="mb-1.5 block text-xs font-medium text-foreground/60">
                Description <span className="text-foreground/30">(optional)</span>
              </label>
              <textarea
                id="board-desc"
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
                placeholder="What is this board for?"
                maxLength={500}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!boardName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Board
              </button>
            </div>
          </form>
        )}

        {/* ─── Project Tab ───────────────────────── */}
        {tab === "project" && (
          <form onSubmit={handleSubmitProject} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label htmlFor="project-name" className="mb-1.5 block text-xs font-medium text-foreground/60">
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Project"
                maxLength={100}
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="project-desc" className="mb-1.5 block text-xs font-medium text-foreground/60">
                Description <span className="text-foreground/30">(optional)</span>
              </label>
              <textarea
                id="project-desc"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="What is this project about?"
                maxLength={500}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60">
                Color
              </label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setProjectColor(c.value)}
                    title={c.label}
                    className={`h-7 w-7 rounded-full ${c.bg} transition-[transform,opacity,box-shadow] duration-150 ease-spring motion-reduce:transition-none ${
                      projectColor === c.value
                        ? `ring-2 ${c.ring} ring-offset-2 ring-offset-background scale-110`
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Time constraints toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTimeConstraints}
                onChange={(e) => setHasTimeConstraints(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">Set time constraints</span>
            </label>

            {/* Date fields */}
            {hasTimeConstraints && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="project-start" className="mb-1.5 block text-xs font-medium text-foreground/60">
                      Start Date
                    </label>
                    <input
                      id="project-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="project-end" className="mb-1.5 block text-xs font-medium text-foreground/60">
                      End Date
                    </label>
                    <input
                      id="project-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="project-deadline" className="mb-1.5 block text-xs font-medium text-foreground/60">
                    Deadline <span className="text-foreground/30">(optional)</span>
                  </label>
                  <input
                    id="project-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !projectName.trim() ||
                  (hasTimeConstraints && (!startDate || !endDate))
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Project
              </button>
            </div>
          </form>
        )}

        {/* ─── Notebook Tab ─────────────────────── */}
        {tab === "notebook" && onCreateNotebook && (
          <form onSubmit={handleSubmitNotebook} className="flex flex-col gap-4">
            {!canCreateNotebook && (
              <p className="text-xs text-foreground/50">
                Maximum 5 notebooks. Delete one to create another.
              </p>
            )}
            <div>
              <label htmlFor="notebook-name" className="mb-1.5 block text-xs font-medium text-foreground/60">
                Notebook Name
              </label>
              <input
                id="notebook-name"
                type="text"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                placeholder="My notebook"
                maxLength={100}
                autoFocus
                disabled={!canCreateNotebook}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!notebookName.trim() || !canCreateNotebook}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Notebook
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
