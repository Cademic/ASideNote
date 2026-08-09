import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardConnectionDto, BoardExportPayload, BoardImageSummaryDto, IndexCardSummaryDto, NoteSummaryDto } from "../types";

const { calls, shouldFailIndexCard } = vi.hoisted(() => ({
  calls: [] as string[],
  shouldFailIndexCard: { value: false },
}));

vi.mock("../api/notes", () => ({
  createNote: vi.fn(async (data: { content: string }) => {
    calls.push(`create-note:${data.content}`);
    return makeNote(`note-${calls.length}`, data.content);
  }),
  deleteNote: vi.fn(async (id: string) => {
    calls.push(`delete-note:${id}`);
  }),
}));

vi.mock("../api/index-cards", () => ({
  createIndexCard: vi.fn(async (data: { content: string }) => {
    if (shouldFailIndexCard.value) {
      calls.push(`create-index-card:${data.content}:FAIL`);
      throw new Error("create index card failed");
    }
    calls.push(`create-index-card:${data.content}`);
    return makeIndexCard(`card-${calls.length}`, data.content);
  }),
  deleteIndexCard: vi.fn(async (id: string) => {
    calls.push(`delete-index-card:${id}`);
  }),
}));

vi.mock("../api/boards", () => ({
  createBoardImageCard: vi.fn(async (_boardId: string, data: { imageUrl: string }) => {
    calls.push(`create-image:${data.imageUrl}`);
    return makeImage(`image-${calls.length}`, data.imageUrl);
  }),
  deleteBoardImageCard: vi.fn(async (_boardId: string, id: string) => {
    calls.push(`delete-image:${id}`);
  }),
}));

vi.mock("../api/connections", () => ({
  createConnection: vi.fn(async (data: { fromItemId: string; toItemId: string }) => {
    calls.push(`create-connection:${data.fromItemId}->${data.toItemId}`);
    return makeConnection(`conn-${calls.length}`, data.fromItemId, data.toItemId);
  }),
  deleteConnection: vi.fn(async (id: string) => {
    calls.push(`delete-connection:${id}`);
  }),
}));

vi.mock("../api/drawings", () => ({
  saveDrawing: vi.fn(async () => {
    calls.push("save-drawing");
  }),
}));

function makeNote(id: string, content: string): NoteSummaryDto {
  return {
    id,
    title: null,
    content,
    folderId: null,
    projectId: null,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    positionX: 20,
    positionY: 20,
    width: 200,
    height: 200,
    color: null,
    rotation: null,
  };
}

function makeIndexCard(id: string, content: string): IndexCardSummaryDto {
  return {
    id,
    title: null,
    content,
    folderId: null,
    projectId: null,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    positionX: 20,
    positionY: 20,
    width: 200,
    height: 200,
    color: null,
    rotation: null,
  };
}

function makeImage(id: string, imageUrl: string): BoardImageSummaryDto {
  return { id, imageUrl, positionX: 0, positionY: 0, width: null, height: null, rotation: null };
}

function makeConnection(id: string, fromItemId: string, toItemId: string): BoardConnectionDto {
  return { id, fromItemId, toItemId, createdAt: "2026-01-01T00:00:00.000Z" };
}

const { importBoardIntoNew, importBoardReplacingExisting } = await import("./boardImport");

describe("boardImport", () => {
  beforeEach(() => {
    calls.length = 0;
    shouldFailIndexCard.value = false;
    vi.clearAllMocks();
  });

  const payload: BoardExportPayload = {
    version: 1,
    boardType: "NoteBoard",
    boardName: "Test board",
    exportedAt: "2026-01-01T00:00:00.000Z",
    notes: [makeNote("src-note-1", "hello")],
    indexCards: [makeIndexCard("src-card-1", "world")],
    imageCards: [makeImage("src-image-1", "https://example.com/a.png")],
    connections: [makeConnection("src-conn-1", "src-note-1", "src-card-1")],
  };

  it("importBoardIntoNew creates notes, cards, images, and mapped connections", async () => {
    const result = await importBoardIntoNew("board-1", payload);

    expect(result.notes).toHaveLength(1);
    expect(result.indexCards).toHaveLength(1);
    expect(result.imageCards).toHaveLength(1);
    expect(result.connections).toHaveLength(1);
    expect(calls).toEqual([
      "create-note:hello",
      "create-index-card:world",
      "create-image:https://example.com/a.png",
      expect.stringMatching(/^create-connection:note-1->card-2$/),
    ]);
  });

  it("importBoardReplacingExisting never deletes existing content until every new item is created", async () => {
    const existing = {
      notes: [makeNote("old-note-1", "old note")],
      indexCards: [makeIndexCard("old-card-1", "old card")],
      imageCards: [makeImage("old-image-1", "https://example.com/old.png")],
      connections: [makeConnection("old-conn-1", "old-note-1", "old-card-1")],
    };

    await importBoardReplacingExisting("board-1", payload, existing);

    const createCalls = calls.filter((c) => c.startsWith("create-"));
    const deleteCalls = calls.filter((c) => c.startsWith("delete-"));
    expect(createCalls).toHaveLength(4);
    expect(deleteCalls).toHaveLength(4);

    const lastCreateIndex = Math.max(...createCalls.map((c) => calls.indexOf(c)));
    const firstDeleteIndex = Math.min(...deleteCalls.map((c) => calls.indexOf(c)));
    expect(firstDeleteIndex).toBeGreaterThan(lastCreateIndex);

    expect(deleteCalls).toEqual(
      expect.arrayContaining([
        "delete-note:old-note-1",
        "delete-index-card:old-card-1",
        "delete-image:old-image-1",
        "delete-connection:old-conn-1",
      ]),
    );
  });

  it("rolls back partially-created new items and never touches existing content when a create fails", async () => {
    shouldFailIndexCard.value = true;
    const existing = {
      notes: [makeNote("old-note-1", "old note")],
      indexCards: [],
      imageCards: [],
      connections: [],
    };

    await expect(importBoardReplacingExisting("board-1", payload, existing)).rejects.toThrow(
      "create index card failed",
    );

    // The note created before the failing index card should be rolled back.
    expect(calls).toContain("create-note:hello");
    expect(calls).toContain("delete-note:note-1");
    // Nothing from the pre-existing board content should ever be deleted.
    expect(calls).not.toContain("delete-note:old-note-1");
    // Nothing downstream of the failure (image, connection) should have been attempted.
    expect(calls.some((c) => c.startsWith("create-image"))).toBe(false);
    expect(calls.some((c) => c.startsWith("create-connection"))).toBe(false);
  });
});
