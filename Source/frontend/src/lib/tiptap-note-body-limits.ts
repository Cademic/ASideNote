import { Extension } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export function countParagraphsInDoc(doc: PmNode): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === "paragraph") n += 1;
  });
  return n;
}

export function countHardBreaksInDoc(doc: PmNode): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === "hardBreak") n += 1;
  });
  return n;
}

export interface NoteBodyLimitsOptions {
  maxParagraphs: number | null;
  maxHardBreaks: number | null;
}

/**
 * Caps paragraph count and hard-break count in the note body (separate from CharacterCount text limit).
 * Allows existing content above the cap (legacy) until the user reduces structure; blocks new splits/pastes that exceed caps.
 */
export const NoteBodyLimits = Extension.create<NoteBodyLimitsOptions>({
  name: "noteBodyLimits",

  addOptions() {
    return {
      maxParagraphs: null as number | null,
      maxHardBreaks: null as number | null,
    };
  },

  addProseMirrorPlugins() {
    const maxP = this.options.maxParagraphs;
    const maxH = this.options.maxHardBreaks;

    return [
      new Plugin({
        key: new PluginKey("noteBodyLimits"),
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true;

          const oldDoc = state.doc;
          const newDoc = transaction.doc;
          const oldP = countParagraphsInDoc(oldDoc);
          const newP = countParagraphsInDoc(newDoc);
          const oldH = countHardBreaksInDoc(oldDoc);
          const newH = countHardBreaksInDoc(newDoc);

          if (maxP != null && newP > maxP) {
            if (newP < oldP) return true;
            if (newP === oldP) return true;
            return false;
          }
          if (maxH != null && newH > maxH) {
            if (newH < oldH) return true;
            if (newH === oldH) return true;
            return false;
          }

          return true;
        },
      }),
    ];
  },
});
