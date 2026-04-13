import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Heading } from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { X, Download, ChevronDown, Upload, Printer } from "lucide-react";
import { FontSize } from "../../lib/tiptap-font-size";
import { handleTabKey } from "../../lib/tiptap-tab-indent";
import { getNotebookById, updateNotebookContent, downloadNotebookExport } from "../../api/notebooks";
import type { NotebookDetailDto } from "../../types";
import { PaperShell } from "./PaperShell";
import { ZoomablePaperShell } from "./ZoomablePaperShell";
import { NoteToolbar } from "../dashboard/NoteToolbar";

const SAVE_DEBOUNCE_MS = 800;
const DEFAULT_DOC = { type: "doc", content: [] } as const;

/** Strip legacy pageMargin nodes: lift their content into the doc so top-of-page text is not lost. */
function stripLegacyPageMargins(doc: object): object {
  if (!doc || typeof doc !== "object") return doc;
  const d = doc as { content?: unknown[] };
  if (!Array.isArray(d.content)) return doc;
  return { ...doc, content: flattenPageMargins(d.content) };
}

function flattenPageMargins(nodes: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const n of nodes) {
    if (typeof n !== "object" || n === null) {
      out.push(n);
      continue;
    }
    const node = n as { type?: string; content?: unknown[] };
    if (node.type === "pageMargin" && Array.isArray(node.content)) {
      out.push(...flattenPageMargins(node.content));
    } else {
      out.push(processNodeContent(n as Record<string, unknown>));
    }
  }
  return out;
}

function processNodeContent(node: Record<string, unknown>): Record<string, unknown> {
  const content = node.content;
  if (!Array.isArray(content)) return node;
  return { ...node, content: flattenPageMargins(content) };
}

function parseContentJson(raw: string | undefined): object {
  if (!raw || !raw.trim()) return { ...DEFAULT_DOC };
  try {
    const parsed = JSON.parse(raw) as object;
    const doc = parsed && typeof parsed === "object" && "type" in parsed ? parsed : { ...DEFAULT_DOC };
    return stripLegacyPageMargins(doc);
  } catch {
    return { ...DEFAULT_DOC };
  }
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFileName(name: string): string {
  return name.replace(/[^\w\s.-]/g, "").trim() || "notebook";
}

interface NotebookModalProps {
  notebookId: string;
  onClose: () => void;
}

export function NotebookModal({ notebookId, onClose }: NotebookModalProps) {
  const [notebook, setNotebook] = useState<NotebookDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const lastSavedJsonRef = useRef<string>("");
  const lastSyncedContentJsonRef = useRef<string>("");
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getNotebookById(notebookId)
      .then((data) => {
        if (!cancelled) {
          setNotebook(data);
          lastSavedJsonRef.current = data.contentJson ?? "{}";
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load notebook.");
      });
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, link: false, underline: false }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Subscript,
      Superscript,
      Underline,
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: null,
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[400px]",
      },
      handleKeyDown: handleTabKey,
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !notebook) return;
    const contentJson = notebook.contentJson ?? "";
    if (contentJson === lastSyncedContentJsonRef.current) return;
    lastSyncedContentJsonRef.current = contentJson;
    const content = parseContentJson(notebook.contentJson);
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, notebook]);

  const save = useMemo(
    () =>
      debounce(async () => {
        if (!editor) return;
        const json = editor.getJSON();
        const jsonString = JSON.stringify(json);
        if (jsonString === lastSavedJsonRef.current) return;
        try {
          await updateNotebookContent(notebookId, {
            contentJson: jsonString,
            updatedAt: notebook?.updatedAt,
          });
          lastSavedJsonRef.current = jsonString;
          if (notebook) setNotebook((prev) => (prev ? { ...prev, updatedAt: new Date().toISOString() } : null));
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            try {
              const data = await getNotebookById(notebookId);
              setNotebook(data);
              const content = parseContentJson(data.contentJson ?? "");
              editor.commands.setContent(content, { emitUpdate: false });
              const jsonStr = data.contentJson ?? "{}";
              lastSavedJsonRef.current = jsonStr;
              lastSyncedContentJsonRef.current = jsonStr;
            } catch {
              // Reload failed; keep editor state
            }
          }
        }
      }, SAVE_DEBOUNCE_MS),
    [editor, notebookId, notebook],
  );

  useEffect(() => {
    if (!editor) return;
    const handler = () => save();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, save]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => {
    if (!downloadMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [downloadMenuOpen]);

  const handleExportFormat = useCallback(
    async (format: string) => {
      setDownloadMenuOpen(false);
      if (!notebook) return;
      setExporting(true);
      try {
        const { blob, filename } = await downloadNotebookExport(notebookId, format);
        triggerDownload(blob, filename);
      } finally {
        setExporting(false);
      }
    },
    [notebookId, notebook],
  );

  const handleSaveAsHtml = useCallback(() => {
    setDownloadMenuOpen(false);
    if (!editor || !notebook) return;
    const html = editor.getHTML();
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    triggerDownload(blob, `${safeFileName(notebook.name)}.html`);
  }, [editor, notebook]);

  const handleSaveAsJson = useCallback(() => {
    setDownloadMenuOpen(false);
    if (!editor || !notebook) return;
    const json = editor.getJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    triggerDownload(blob, `${safeFileName(notebook.name)}.json`);
  }, [editor, notebook]);

  const handleImportJson = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      setDownloadMenuOpen(false);
      file
        .text()
        .then((text) => {
          try {
            const parsed = JSON.parse(text) as object;
            if (parsed && typeof parsed === "object" && (parsed as { type?: string }).type === "doc") {
              editor.commands.setContent(parsed, { emitUpdate: false });
              lastSavedJsonRef.current = JSON.stringify(parsed);
            }
          } catch {
            // Invalid JSON or not a TipTap doc; ignore
          }
        })
        .finally(() => {
          e.target.value = "";
        });
    },
    [editor],
  );

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-xl border border-border bg-background p-6 shadow-xl max-w-sm w-full text-center">
          <p className="text-sm text-red-500 mb-4 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading notebook...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-page-enter motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label="Notebook"
    >
      {/* Notepad-style header */}
      <div className="notepad-card flex-shrink-0 border-b border-border/50">
        <div className="notepad-spiral-strip" />
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <span className="text-base font-semibold text-foreground truncate">{notebook.name}</span>
          <div className="flex items-center gap-2">
            {editor && (
              <div className="hidden sm:block">
                <NoteToolbar editor={editor} />
              </div>
            )}
            {editor && (
              <div ref={downloadMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadMenuOpen((v) => !v)}
                  disabled={exporting}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors duration-150 hover:bg-amber-100/50 hover:text-foreground disabled:opacity-50 dark:hover:bg-amber-900/20 motion-reduce:transition-none"
                aria-label="Download"
                aria-expanded={downloadMenuOpen}
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {downloadMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-background py-1 shadow-xl">
                  <div className="px-2 py-1 text-xs font-medium text-foreground/60">Print</div>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center gap-2"
                    onClick={() => { setDownloadMenuOpen(false); window.print(); }}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / Save as PDF
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  <div className="px-2 py-1 text-xs font-medium text-foreground/60">Export (server)</div>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={() => handleExportFormat("pdf")}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={() => handleExportFormat("txt")}
                  >
                    Plain text (.txt)
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={() => handleExportFormat("md")}
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={() => handleExportFormat("html")}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={() => handleExportFormat("docx")}
                  >
                    Word (.docx)
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  <div className="px-2 py-1 text-xs font-medium text-foreground/60">Save for editing</div>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={handleSaveAsHtml}
                  >
                    Save as HTML
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20"
                    onClick={handleSaveAsJson}
                  >
                    Save as JSON
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  <div className="px-2 py-1 text-xs font-medium text-foreground/60">Import</div>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center gap-2"
                    onClick={() => importFileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import from file (.json)
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    aria-hidden
                    onChange={handleImportJson}
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close notebook"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ZoomablePaperShell>
          <PaperShell>
            <EditorContent editor={editor} />
          </PaperShell>
        </ZoomablePaperShell>
      </div>
    </div>
  );
}
