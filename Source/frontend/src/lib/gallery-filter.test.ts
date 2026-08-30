import { describe, expect, test } from "vitest";
import {
  filterGalleryItems,
  groupGalleryItemsByKind,
  sortGalleryItems,
  GALLERY_KIND_ORDER,
} from "./gallery-filter";
import { toGalleryItems } from "./gallery-item";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  activeFilterCount,
  hasNonTypeNarrowing,
  isDefaultFilterState,
  validateFilterState,
  validateSort,
} from "./gallery-prefs";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectSummaryDto,
} from "../types";
import type { GalleryFilterState, GalleryItem } from "../types/gallery";

const NOW = Date.parse("2026-03-10T12:00:00.000Z");
const DAY = 86_400_000;

function iso(offsetDays: number): string {
  return new Date(NOW - offsetDays * DAY).toISOString();
}

function makeItem(overrides: Partial<GalleryItem> & { id: string }): GalleryItem {
  return {
    kind: "noteboard",
    name: overrides.id,
    to: `/boards/${overrides.id}`,
    createdAt: iso(10),
    updatedAt: iso(10),
    isPinned: false,
    pinnedAt: null,
    projectStatus: null,
    ownership: "owned",
    ownerLabel: null,
    color: null,
    description: null,
    itemCount: null,
    projectId: null,
    projectName: null,
    raw: {} as GalleryItem["raw"],
    ...overrides,
  };
}

function filters(overrides: Partial<GalleryFilterState>): GalleryFilterState {
  return { ...DEFAULT_FILTERS, ...overrides };
}

// --- toGalleryItems ---------------------------------------------------------

function makeProject(
  overrides: Partial<ProjectSummaryDto> & { id: string },
): ProjectSummaryDto {
  return {
    name: overrides.id,
    description: null,
    startDate: null,
    endDate: null,
    deadline: null,
    status: "Active",
    progress: 0,
    color: "violet",
    ownerId: "user-1",
    ownerUsername: "carter",
    userRole: "Owner",
    memberCount: 0,
    boardCount: 3,
    createdAt: iso(5),
    isPinned: false,
    pinnedAt: null,
    ...overrides,
  };
}

function makeBoard(
  overrides: Partial<BoardSummaryDto> & { id: string },
): BoardSummaryDto {
  return {
    name: overrides.id,
    description: null,
    boardType: "NoteBoard",
    projectId: null,
    isPinned: false,
    pinnedAt: null,
    createdAt: iso(3),
    updatedAt: iso(2),
    noteCount: 4,
    indexCardCount: 1,
    ...overrides,
  };
}

function makeNotebook(
  overrides: Partial<NotebookSummaryDto> & { id: string },
): NotebookSummaryDto {
  return {
    name: overrides.id,
    projectId: null,
    isPinned: false,
    pinnedAt: null,
    createdAt: iso(3),
    updatedAt: iso(1),
    ...overrides,
  };
}

describe("toGalleryItems", () => {
  test("splits boards into noteboard vs chalkboard and builds detail routes", () => {
    const items = toGalleryItems(
      [],
      [
        makeBoard({ id: "n1", boardType: "NoteBoard" }),
        makeBoard({ id: "c1", boardType: "ChalkBoard" }),
      ],
      [],
      "user-1",
    );
    const note = items.find((i) => i.id === "n1");
    const chalk = items.find((i) => i.id === "c1");
    expect(note?.kind).toBe("noteboard");
    expect(note?.to).toBe("/boards/n1");
    expect(chalk?.kind).toBe("chalkboard");
    expect(chalk?.to).toBe("/chalkboards/c1");
  });

  test("project updatedAt falls back to createdAt and itemCount = boardCount", () => {
    const [item] = toGalleryItems(
      [makeProject({ id: "p1", createdAt: iso(7), boardCount: 9 })],
      [],
      [],
      "user-1",
    );
    expect(item.updatedAt).toBe(item.createdAt);
    expect(item.updatedAt).toBe(iso(7));
    expect(item.itemCount).toBe(9);
  });

  test("ownership: owner role -> owned, non-owner -> shared", () => {
    const items = toGalleryItems(
      [
        makeProject({ id: "mine", ownerId: "user-1", userRole: "Owner" }),
        makeProject({ id: "theirs", ownerId: "user-2", userRole: "Editor" }),
      ],
      [],
      [],
      "user-1",
    );
    expect(items.find((i) => i.id === "mine")?.ownership).toBe("owned");
    expect(items.find((i) => i.id === "theirs")?.ownership).toBe("shared");
  });

  test("board ownership is derived from its parent project", () => {
    const items = toGalleryItems(
      [
        makeProject({ id: "own", ownerId: "user-1", userRole: "Owner" }),
        makeProject({ id: "shr", ownerId: "user-2", userRole: "Viewer" }),
      ],
      [
        makeBoard({ id: "b-own", projectId: "own" }),
        makeBoard({ id: "b-shr", projectId: "shr" }),
        makeBoard({ id: "b-standalone", projectId: null }),
      ],
      [],
      "user-1",
    );
    expect(items.find((i) => i.id === "b-own")?.ownership).toBe("owned");
    expect(items.find((i) => i.id === "b-shr")?.ownership).toBe("shared");
    expect(items.find((i) => i.id === "b-standalone")?.ownership).toBe("owned");
  });

  test("notebook under an unknown project id resolves to 'unknown'", () => {
    const [item] = toGalleryItems(
      [],
      [],
      [makeNotebook({ id: "nb", projectId: "ghost-project" })],
      "user-1",
    );
    expect(item.ownership).toBe("unknown");
    expect(item.projectName).toBeNull();
  });

  test("board / notebook in a project carry the project name", () => {
    const items = toGalleryItems(
      [makeProject({ id: "p1", name: "Client Alpha" })],
      [makeBoard({ id: "b1", projectId: "p1" })],
      [makeNotebook({ id: "n1", projectId: "p1" })],
      "user-1",
    );
    expect(items.find((i) => i.id === "b1")?.projectName).toBe("Client Alpha");
    expect(items.find((i) => i.id === "n1")?.projectName).toBe("Client Alpha");
    // standalone board -> no project name
    const [standalone] = toGalleryItems(
      [],
      [makeBoard({ id: "b2", projectId: null })],
      [],
      "user-1",
    );
    expect(standalone.projectName).toBeNull();
  });
});

// --- filterGalleryItems ---------------------------------------------------

describe("filterGalleryItems", () => {
  const base = [
    makeItem({ id: "p-active", kind: "project", projectStatus: "Active" }),
    makeItem({ id: "p-done", kind: "project", projectStatus: "Completed" }),
    makeItem({ id: "nb", kind: "noteboard" }),
    makeItem({ id: "cb", kind: "chalkboard" }),
    makeItem({ id: "note", kind: "notebook" }),
  ];

  test("the default (everything selected) is identity", () => {
    expect(filterGalleryItems(base, DEFAULT_FILTERS, NOW)).toHaveLength(
      base.length,
    );
    expect(isDefaultFilterState(DEFAULT_FILTERS)).toBe(true);
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(hasNonTypeNarrowing(DEFAULT_FILTERS)).toBe(false);
  });

  test("kinds narrows to the selected kinds", () => {
    const out = filterGalleryItems(
      base,
      filters({ kinds: ["notebook", "chalkboard"] }),
      NOW,
    );
    expect(out.map((i) => i.id).sort()).toEqual(["cb", "note"]);
  });

  test("projectStatuses narrows only projects, never other kinds", () => {
    const out = filterGalleryItems(
      base,
      filters({ projectStatuses: ["Active"] }),
      NOW,
    );
    expect(out.map((i) => i.id).sort()).toEqual([
      "cb",
      "nb",
      "note",
      "p-active",
    ]);
  });

  test("ownership treats 'unknown' as 'owned'", () => {
    const items = [
      makeItem({ id: "owned", ownership: "owned" }),
      makeItem({ id: "shared", ownership: "shared" }),
      makeItem({ id: "unknown", ownership: "unknown" }),
    ];
    expect(
      filterGalleryItems(items, filters({ ownership: ["owned"] }), NOW)
        .map((i) => i.id)
        .sort(),
    ).toEqual(["owned", "unknown"]);
    expect(
      filterGalleryItems(items, filters({ ownership: ["shared"] }), NOW).map(
        (i) => i.id,
      ),
    ).toEqual(["shared"]);
  });

  test("pinnedOnly keeps only pinned items", () => {
    const items = [
      makeItem({ id: "a", isPinned: true }),
      makeItem({ id: "b", isPinned: false }),
    ];
    expect(
      filterGalleryItems(items, filters({ pinnedOnly: true }), NOW).map(
        (i) => i.id,
      ),
    ).toEqual(["a"]);
  });

  test("recentWithinDays is inclusive at exactly N days", () => {
    const items = [
      makeItem({ id: "edge", updatedAt: new Date(NOW - 7 * DAY).toISOString() }),
      makeItem({
        id: "old",
        updatedAt: new Date(NOW - 7 * DAY - 1000).toISOString(),
      }),
    ];
    expect(
      filterGalleryItems(items, filters({ recentWithinDays: 7 }), NOW).map(
        (i) => i.id,
      ),
    ).toEqual(["edge"]);
  });
});

// --- sortGalleryItems ---------------------------------------------------

describe("sortGalleryItems", () => {
  test("name sort respects direction", () => {
    const items = [
      makeItem({ id: "c", name: "Charlie" }),
      makeItem({ id: "a", name: "alpha" }),
      makeItem({ id: "b", name: "Bravo" }),
    ];
    expect(sortGalleryItems(items, "name", "asc").map((i) => i.name)).toEqual([
      "alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(sortGalleryItems(items, "name", "desc").map((i) => i.name)).toEqual([
      "Charlie",
      "Bravo",
      "alpha",
    ]);
  });

  test("type sort follows GALLERY_KIND_ORDER", () => {
    const items = GALLERY_KIND_ORDER.map((kind, index) =>
      makeItem({ id: `k${index}`, kind }),
    ).reverse();
    expect(sortGalleryItems(items, "type", "asc").map((i) => i.kind)).toEqual(
      GALLERY_KIND_ORDER,
    );
  });

  test("modified sort orders by updatedAt", () => {
    const items = [
      makeItem({ id: "old", updatedAt: iso(30) }),
      makeItem({ id: "new", updatedAt: iso(1) }),
      makeItem({ id: "mid", updatedAt: iso(10) }),
    ];
    expect(
      sortGalleryItems(items, "modified", "desc").map((i) => i.id),
    ).toEqual(["new", "mid", "old"]);
  });

  test("stable secondary sort by name then id on ties", () => {
    const items = [
      makeItem({ id: "z", name: "Same", updatedAt: iso(5) }),
      makeItem({ id: "a", name: "Same", updatedAt: iso(5) }),
    ];
    expect(sortGalleryItems(items, "modified", "asc").map((i) => i.id)).toEqual([
      "a",
      "z",
    ]);
  });

  test("does not mutate the input array", () => {
    const items = [makeItem({ id: "b" }), makeItem({ id: "a" })];
    const snapshot = items.map((i) => i.id);
    sortGalleryItems(items, "name", "asc");
    expect(items.map((i) => i.id)).toEqual(snapshot);
  });
});

// --- groupGalleryItemsByKind ------------------------------------------------

describe("groupGalleryItemsByKind", () => {
  test("groups in kind order and drops empty kinds", () => {
    const items = [
      makeItem({ id: "nb", kind: "noteboard" }),
      makeItem({ id: "p", kind: "project" }),
    ];
    const groups = groupGalleryItemsByKind(items);
    expect(groups.map((g) => g.kind)).toEqual(["project", "noteboard"]);
  });

  test("within a group, pinned come first then newest", () => {
    const items = [
      makeItem({ id: "old", kind: "notebook", updatedAt: iso(20) }),
      makeItem({ id: "pinnedOld", kind: "notebook", isPinned: true, updatedAt: iso(40) }),
      makeItem({ id: "new", kind: "notebook", updatedAt: iso(1) }),
    ];
    const [group] = groupGalleryItemsByKind(items);
    expect(group.items.map((i) => i.id)).toEqual(["pinnedOld", "new", "old"]);
  });
});

// --- prefs validation -----------------------------------------------------

describe("validateFilterState", () => {
  test("non-objects fall back to defaults", () => {
    expect(validateFilterState(undefined)).toEqual(DEFAULT_FILTERS);
    expect(validateFilterState("not json")).toEqual(DEFAULT_FILTERS);
    expect(validateFilterState([1, 2, 3])).toEqual(DEFAULT_FILTERS);
    expect(validateFilterState(42)).toEqual(DEFAULT_FILTERS);
  });

  test("unknown enum members are dropped, order is canonical", () => {
    const out = validateFilterState({
      kinds: ["notebook", "bogus", "project"],
      projectStatuses: ["Archived", "Nope"],
      ownership: ["shared", "invalid"],
      pinnedOnly: "yes",
      recentWithinDays: 99,
    });
    expect(out.kinds).toEqual(["project", "notebook"]);
    expect(out.projectStatuses).toEqual(["Archived"]);
    expect(out.ownership).toEqual(["shared"]);
    expect(out.pinnedOnly).toBe(false);
    expect(out.recentWithinDays).toBeNull();
  });

  test("valid recent window is preserved", () => {
    expect(validateFilterState({ recentWithinDays: 30 }).recentWithinDays).toBe(
      30,
    );
  });

  test("missing facet arrays fall back to all-selected", () => {
    const out = validateFilterState({ pinnedOnly: true });
    expect(out.kinds).toEqual(DEFAULT_FILTERS.kinds);
    expect(out.projectStatuses).toEqual(DEFAULT_FILTERS.projectStatuses);
    expect(out.ownership).toEqual(DEFAULT_FILTERS.ownership);
    expect(out.pinnedOnly).toBe(true);
  });

  test("a present empty array is kept as-is", () => {
    expect(validateFilterState({ kinds: [] }).kinds).toEqual([]);
  });
});

describe("validateSort", () => {
  test("bad shapes and unknown keys fall back to DEFAULT_SORT", () => {
    expect(validateSort(undefined)).toEqual(DEFAULT_SORT);
    expect(validateSort({ key: "nonsense", dir: "asc" })).toEqual(DEFAULT_SORT);
    expect(validateSort({ key: "name", dir: "sideways" })).toEqual(DEFAULT_SORT);
  });

  test("valid pair is preserved", () => {
    expect(validateSort({ key: "created", dir: "asc" })).toEqual({
      key: "created",
      dir: "asc",
    });
  });
});

describe("activeFilterCount", () => {
  test("the fully-selected default counts as zero", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  test("a facet only counts as a non-empty proper subset", () => {
    expect(activeFilterCount(filters({ kinds: ["project"] }))).toBe(1);
    // every kind selected == no narrowing
    expect(
      activeFilterCount(
        filters({ kinds: ["project", "noteboard", "chalkboard", "notebook"] }),
      ),
    ).toBe(0);
    // unchecking everything is treated as "all" too
    expect(activeFilterCount(filters({ kinds: [] }))).toBe(0);
  });

  test("counts each narrowing facet group once", () => {
    expect(
      activeFilterCount(
        filters({
          kinds: ["project"],
          ownership: ["owned"],
          pinnedOnly: true,
          recentWithinDays: 7,
        }),
      ),
    ).toBe(4);
  });
});
