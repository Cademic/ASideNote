import { liftListItem as pmLiftListItem, sinkListItem as pmSinkListItem } from "@tiptap/pm/schema-list";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Handle Tab: when in a list, sink (indent) or lift (outdent) the list item; cursor moves with it.
 * Otherwise insert a tab character.
 */
export function handleTabKey(view: EditorView, event: KeyboardEvent): boolean {
  if (event.key !== "Tab") return false;
  event.preventDefault();

  const { state } = view;
  const { $from } = state.selection;
  const isShift = event.shiftKey;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    const itemType = node.type.name === "taskItem"
      ? state.schema.nodes.taskItem
      : state.schema.nodes.listItem;
    if (node.type.name === "listItem" || node.type.name === "taskItem") {
      if (!itemType) return false;
      const cmd = isShift ? pmLiftListItem(itemType) : pmSinkListItem(itemType);
      if (cmd(state, (tr) => view.dispatch(tr.scrollIntoView()))) return true;
      return false;
    }
  }

  view.dispatch(state.tr.insertText("\t"));
  return true;
}
