# Keyboard Accessibility Plan

Goal: every feature of the app can be reached and operated with the keyboard
alone, with a visible focus indicator and screen-reader-appropriate semantics.

## Context

The frontend has **no accessibility UI library** (no Radix / Headless UI / react-aria).
Every dialog, menu, dropdown, combobox and canvas control is hand-rolled. An audit
(Sept 2026) found:

- No skip link; `<main>` had no landmark id.
- 84 `focus:outline-none` usages, no shared focus token — many controls had **no
  visible keyboard focus**.
- No dialog traps or restores focus; most custom dialogs have no `role="dialog"`.
- Custom `role="menu"` widgets have no arrow-key navigation.
- `<div role="button">` / `<div onClick>` fake buttons in cards, gallery list rows,
  the sidebar board-tools palette.
- `FontFamilySearch` / `FontSizeSearch` options fire on `onMouseDown` only —
  **unusable by keyboard**.
- Drag-and-drop (board cards, projects-tree folder reorder, red-string links) has
  **no keyboard alternative**.
- Calendar: no visible "New event" button; empty-slot create is `<div onClick>`.

Good foundations to reuse: `GlobalSearch` (⌘K palette, correct combobox ARIA),
`SidebarRail` (correct splitter pattern), `lib/is-editable-target.ts` (typing guard).

## Phases

### Phase 1 — Foundations ✅ (done)

- `hooks/useFocusTrap.ts` — trap + restore focus + scroll lock + Escape.
- `hooks/useRovingFocus.ts` — arrow/Home/End/typeahead roving focus for
  `role="menu"` / `role="listbox"`, focus-first-item, focus-return.
- `hooks/useCloseOnEscape.ts` — shared "Escape closes this popup" for surfaces
  that don't warrant a full focus trap.
- `hooks/useBoardItemKeyboardMove.ts` — arrow-key move for freeform board items
  (Shift = larger step, Enter = activate); the keyboard equivalent of dragging.
- `lib/announce.ts` — provider-free polite/assertive live region.
- Global `*:focus-visible` outline in `index.css` (`!important` to beat
  `focus:outline-none`); opt out with `data-a11y-focus="self"`, suppress on
  programmatically-focused shells with `data-a11y-focus="none"`.
- Route-change announcement (page `<title>`) in `AppLayout`.
- `<aside aria-label="Sidebar">`.
- Applied `useFocusTrap` + `role="dialog"` to `ConfirmDialog`, `PromptDialog`.
- Applied `useRovingFocus` to `ui/ContextMenu` and the Navbar user menu.
- Applied `useCloseOnEscape` to the create/add dialogs (`CreateBoardDialog`,
  `CreateEventDialog`, `CreateNotebookDialog`, `CreateProjectDialog`,
  `CreateProjectFolderDialog`, `AddExistingBoardDialog`,
  `AddExistingNotebookDialog`, `AddMemberDialog`), `EventDetailsPopup`,
  `ProjectMoveFlyout`, and the Settings delete-account modal.
- Applied `useBoardItemKeyboardMove` to `StickyNote`, `IndexCard`, `ImageCard`
  (each outer node is now `tabIndex={0}` + `role="group"` + instructions label).

Not done / reverted: no skip link (removed at the user's request; the
`#main-content` landmark went with it).

### Phase 2 — Dialogs ✅ (done)

New `hooks/useModalDialog.ts` (focus trap + restore + scroll lock + Escape +
`aria` props). Applied to `CreateBoardDialog`, `CreateEventDialog`,
`EventDetailsPopup`, `CreateNotebookDialog`, `CreateProjectDialog`,
`CreateProjectFolderDialog`, `AddExistingBoardDialog`, `AddExistingNotebookDialog`,
`AddMemberDialog`, `GalleryRenameDialog`, and the Settings delete-account modal —
each now `role="dialog"` / `aria-modal` / `aria-labelledby`, per-dialog `document`
Escape listeners removed. (`ConfirmDialog` / `PromptDialog` done in Phase 1.)
Deferred: `ProjectDetailPage` inline rename modals.

### Phase 3 — Menus & menu bars ✅ (mostly)

- `useRovingFocus` + focus-on-open + focus-return applied to: `ui/ContextMenu`
  (Phase 1), Navbar user menu (Phase 1), `GalleryItemMenu`, `CalendarViewMenu`,
  `ProjectsTree` folder menu, `MemberList` role menu. Each gets
  `aria-haspopup` / `aria-expanded` on its trigger and `tabIndex={-1}` items.
- `BoardMenuBar` / `NotebookMenuBar`: Escape closes the open menu,
  `aria-haspopup` / `aria-expanded` on every top-level trigger.
- Deferred: full `role="menubar"` Left/Right roving between top-level menus;
  `Shift+F10` keyboard entry for the canvas right-click menus; `GalleryFilterPanel`
  (a filter popover, already Escape + Tab navigable).

### Phase 4 — Fake buttons → real semantics ✅ (done)

- `BoardCard` / `ProjectCard` sidebar rows → real `<Link>`; `NotebookCard`
  sidebar row → real `<button>`. Ellipsis triggers on all three → real `<button>`
  with `aria-haspopup` / `aria-expanded` and
  `group-focus-within:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100`.
- Navbar breadcrumb: `<button onClick={navigate}>` → `<Link>`.
- Sidebar board-tools palette: `<div draggable onClick>` → `<button>` (drag kept).
- `GalleryListRow`: item name is now a real `<Link>`; row-click kept as a mouse
  convenience only.
- Deferred: card-layout (non-sidebar) outer `<div role="button">` — keyboard
  operable already; a stretched-`<Link>` refactor is the remaining nicety.

### Phase 5 — Comboboxes ✅ (done)

`FontFamilySearch`, `FontSizeSearch`, `FontFamilySearchMenu`, `FontSizeSearchMenu`:
`ArrowUp`/`ArrowDown`/`Home`/`End` move an `activeIndex`, `aria-activedescendant`
points at it, `Enter` selects it, options render `role="option"` +
`aria-selected` and highlight on hover. Keyboard users can now pick a result.

### Phase 6 — Drag-and-drop keyboard alternatives ✅ (partial)

- **Board cards** (`StickyNote` / `IndexCard` / `ImageCard`): arrow-key move +
  Shift-for-bigger-step + Enter-to-edit + **Delete-to-remove** (via
  `useBoardItemKeyboardMove`). Deferred: `Alt`+arrows resize, "Link to…" /
  z-order context-menu items, `lib/announce` on move.
- **Calendar**: visible **"New event"** button in the header
  (`CalendarsPage`), and the month day-cell "+" button now reveals on
  `focus-visible` with a dated `aria-label`. Deferred: focusable time-grid
  slots, `ProjectCalendar` New-event button, keyboard reschedule.
- Deferred: `CorkBoard` / `ChalkCanvas` arrow-key pan (Space-pan + keyboard
  `ZoomControls` exist); `ProjectsTree` full `role="tree"` (expand/collapse are
  real buttons); `ProjectFolderDnD` menu-equivalent audit.

### Phase 7 — Shortcut help + lint guardrail ✅ (partial)

- `?` opens `components/a11y/KeyboardShortcutsDialog` — a grouped reference of
  every binding (global / menus / calendar / boards). Wired in `AppLayout` with
  an `isEditableTarget` guard.
- `eslint-plugin-jsx-a11y` added to `eslint.config.js` (recommended set). The
  pre-existing backlog (~150 findings: `label-has-associated-control`,
  `interactive-supports-focus`, static-element-interaction, …) is set to **warn**
  so the build stays green; burn these down incrementally, keep new code clean.
- Deferred: consolidating the ~8 scattered `window` keydown effects into one
  registry; `vitest-axe` smoke tests; full manual walkthrough.

## Verification

- `npm run build` — passes (`npm run build` also runs `tsc -b`, which still
  reports one unrelated pre-existing error in the untracked
  `components/calendar/CalendarTimeGrid.tsx`; `vite build` alone is clean).
- `npm run lint` — 0 errors (jsx-a11y backlog as warnings), `npm test` — 73 pass.
- Manual: unplug the mouse. Every interactive element shows a focus ring. `?`
  opens the shortcuts card. Open any dialog / popup: Escape closes it; the create
  dialogs, `ConfirmDialog`, `PromptDialog` trap focus and return it to the opener.
  Open any menu: arrows move between items, Escape/Tab close and restore focus,
  first-letter jumps. Font family / size fields: type to filter, arrows +
  Enter to pick. On a board: Tab to a note/card/image, arrows move it, Shift+arrow
  moves further, Enter edits, Delete removes. Calendar: the "New event" button
  and focused day-cell "+" both open the create dialog. Screen reader: route
  changes announced; dialogs announce their title.
