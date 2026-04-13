import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import {
  HIGHLIGHT_COLORS,
  hexForColorInput,
  TEXT_COLORS,
} from "./noteToolbarConstants";
import { FontFamilySearchMenu } from "./FontFamilySearch";
import { FontSizeSearchMenu } from "./FontSizeSearch";
import { parseFontSizeAttr } from "./noteToolbarConstants";
import { dividerClass, HoverSubmenu, menuItemClass } from "./boardMenuShared";

function itemActiveClass(active: boolean) {
  return active ? " bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-100" : "";
}

function MenuCustomColorButton({
  value,
  onPick,
}: {
  value: string;
  onPick: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerValue, setPickerValue] = useState(() => hexForColorInput(value));
  useEffect(() => {
    setPickerValue(hexForColorInput(value));
  }, [value]);
  return (
    <>
      <input
        ref={inputRef}
        type="color"
        value={pickerValue}
        onChange={(e) => {
          const v = e.target.value;
          setPickerValue(v);
          onPick(v);
        }}
        className="pointer-events-none fixed h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        className={menuItemClass}
        onClick={() => inputRef.current?.click()}
      >
        Custom color…
      </button>
    </>
  );
}

const toolkitHintClass = "px-3 py-2 text-xs leading-snug text-foreground/60";

function EditToolkitIdleHint() {
  return (
    <>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Text</p>
      <p className={toolkitHintClass}>
        Click a sticky note or index card to start editing. Then font, style, and color apply to that note.
      </p>
    </>
  );
}

function InsertToolkitIdleHint() {
  return (
    <>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">In note</p>
      <p className={toolkitHintClass}>Open a note or card for editing to add links and lists inside it.</p>
    </>
  );
}

function ViewToolkitIdleHint() {
  return (
    <>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Note layout</p>
      <p className={toolkitHintClass}>Open a note or card for editing to change text alignment.</p>
    </>
  );
}

export function BoardMenuMobileEditToolkit({
  editor,
}: {
  editor: Editor | null;
}) {
  if (!editor) {
    return (
      <div>
        <EditToolkitIdleHint />
      </div>
    );
  }
  return <BoardMenuMobileEditToolkitActive editor={editor} />;
}

function BoardMenuMobileEditToolkitActive({
  editor,
}: {
  editor: Editor;
}) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        isBold: ed.isActive("bold"),
        isItalic: ed.isActive("italic"),
        isUnderline: ed.isActive("underline"),
        isStrike: ed.isActive("strike"),
        color: ed.getAttributes("textStyle").color as string | undefined,
        isHighlight: ed.isActive("highlight"),
        highlightColor: (ed.getAttributes("highlight").color as string | undefined) ?? "#fef08a",
      };
    },
  });
  const s = state ?? {
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    color: undefined,
    isHighlight: false,
    highlightColor: "#fef08a",
  };
  const currentColor = s.color ?? "#1f2937";
  const currentSize = parseFontSizeAttr(editor.getAttributes("textStyle").fontSize as string | undefined, 14);

  return (
    <div>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Text</p>
      <HoverSubmenu label="Font family">
        <FontFamilySearchMenu
          currentFontValue={editor.getAttributes("textStyle").fontFamily as string | undefined}
          onPick={(value) => {
            editor.chain().focus().setFontFamily(value).run();
          }}
        />
      </HoverSubmenu>
      <HoverSubmenu label="Font size">
        <FontSizeSearchMenu
          currentSizePx={currentSize}
          onPick={(px) => {
            editor.chain().focus().setFontSize(`${px}px`).run();
          }}
        />
      </HoverSubmenu>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(s.isBold)}`}
        onClick={() => {
          editor.chain().focus().toggleBold().run();
        }}
      >
        <Bold className="h-3.5 w-3.5" />
        Bold
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(s.isItalic)}`}
        onClick={() => {
          editor.chain().focus().toggleItalic().run();
        }}
      >
        <Italic className="h-3.5 w-3.5" />
        Italic
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(s.isUnderline)}`}
        onClick={() => {
          editor.chain().focus().toggleUnderline().run();
        }}
      >
        <Underline className="h-3.5 w-3.5" />
        Underline
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(s.isStrike)}`}
        onClick={() => {
          editor.chain().focus().toggleStrike().run();
        }}
      >
        <Strikethrough className="h-3.5 w-3.5" />
        Strikethrough
      </button>
      <HoverSubmenu
        label={
          <span className="flex items-center gap-2">
            <Highlighter className="h-3.5 w-3.5" />
            Highlight
          </span>
        }
      >
        {s.isHighlight && (
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
            }}
          >
            Remove highlight
          </button>
        )}
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`${menuItemClass}${s.highlightColor === c.value && s.isHighlight ? " bg-sky-50 dark:bg-sky-900/30" : ""}`}
            onClick={() => {
              editor.chain().focus().toggleHighlight({ color: c.value }).run();
            }}
          >
            <span className="h-4 w-4 rounded border border-black/20" style={{ backgroundColor: c.value }} />
            {c.label}
          </button>
        ))}
        <MenuCustomColorButton
          value={s.highlightColor}
          onPick={(hex) => editor.chain().focus().toggleHighlight({ color: hex }).run()}
        />
      </HoverSubmenu>
      <HoverSubmenu
        label={
          <span className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5" />
            Text color
          </span>
        }
      >
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`${menuItemClass}${currentColor === c.value ? " bg-sky-50 dark:bg-sky-900/30" : ""}`}
            onClick={() => {
              editor.chain().focus().setColor(c.value).run();
            }}
          >
            <span className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: c.value }} />
            {c.label}
          </button>
        ))}
        <MenuCustomColorButton
          value={currentColor}
          onPick={(hex) => editor.chain().focus().setColor(hex).run()}
        />
      </HoverSubmenu>
    </div>
  );
}

export function BoardMenuMobileInsertToolkit({
  editor,
}: {
  editor: Editor | null;
}) {
  if (!editor) {
    return (
      <div>
        <InsertToolkitIdleHint />
      </div>
    );
  }
  return <BoardMenuMobileInsertToolkitActive editor={editor} />;
}

function BoardMenuMobileInsertToolkitActive({
  editor,
}: {
  editor: Editor;
}) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      const orderedType = ed.getAttributes("orderedList").type;
      return {
        isBullet: ed.isActive("bulletList"),
        isOrdered: ed.isActive("orderedList"),
        isABC: orderedType === "A" || orderedType === "a",
      };
    },
  });
  const st = state ?? { isBullet: false, isOrdered: false, isABC: false };

  return (
    <div>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">In note</p>
      <button
        type="button"
        className={menuItemClass}
        onClick={() => {
          const href = editor.getAttributes("link").href as string | undefined;
          const next = window.prompt("Link URL", href?.trim() || "https://");
          if (next === null) return;
          if (next.trim()) {
            editor.chain().focus().setLink({ href: next.trim() }).run();
          } else {
            editor.chain().focus().unsetLink().run();
          }
        }}
      >
        <LinkIcon className="h-3.5 w-3.5" />
        Link…
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(st.isBullet)}`}
        onClick={() => {
          editor.chain().focus().toggleBulletList().run();
        }}
      >
        <List className="h-3.5 w-3.5" />
        Bullet list
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(st.isOrdered && !st.isABC)}`}
        onClick={() => {
          if (editor.isActive("orderedList")) {
            editor.chain().focus().updateAttributes("orderedList", { type: null }).run();
          } else {
            editor.chain().focus().toggleOrderedList().run();
          }
        }}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Numbered list
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(st.isABC)}`}
        onClick={() => {
          if (editor.isActive("orderedList")) {
            editor.chain().focus().updateAttributes("orderedList", { type: "A" }).run();
          } else {
            editor.chain().focus().toggleOrderedList().updateAttributes("orderedList", { type: "A" }).run();
          }
        }}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        ABC list
      </button>
    </div>
  );
}

export function BoardMenuMobileViewToolkit({
  editor,
}: {
  editor: Editor | null;
}) {
  if (!editor) {
    return (
      <div>
        <ViewToolkitIdleHint />
      </div>
    );
  }
  return <BoardMenuMobileViewToolkitActive editor={editor} />;
}

function BoardMenuMobileViewToolkitActive({
  editor,
}: {
  editor: Editor;
}) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        textAlignLeft: ed.isActive({ textAlign: "left" }),
        textAlignCenter: ed.isActive({ textAlign: "center" }),
        textAlignRight: ed.isActive({ textAlign: "right" }),
      };
    },
  });
  const al = state ?? {
    textAlignLeft: false,
    textAlignCenter: false,
    textAlignRight: false,
  };

  return (
    <div>
      <div className={dividerClass} />
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Note layout</p>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(al.textAlignLeft)}`}
        onClick={() => {
          editor.chain().focus().setTextAlign("left").run();
        }}
      >
        <AlignLeft className="h-3.5 w-3.5" />
        Align left
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(al.textAlignCenter)}`}
        onClick={() => {
          editor.chain().focus().setTextAlign("center").run();
        }}
      >
        <AlignCenter className="h-3.5 w-3.5" />
        Align center
      </button>
      <button
        type="button"
        className={`${menuItemClass}${itemActiveClass(al.textAlignRight)}`}
        onClick={() => {
          editor.chain().focus().setTextAlign("right").run();
        }}
      >
        <AlignRight className="h-3.5 w-3.5" />
        Align right
      </button>
    </div>
  );
}
