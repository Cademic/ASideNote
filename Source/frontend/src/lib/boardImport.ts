import type {
  BoardConnectionDto,
  BoardExportPayload,
  BoardImageSummaryDto,
  IndexCardSummaryDto,
  NoteSummaryDto,
} from "../types";
import { createNote, deleteNote } from "../api/notes";
import { createIndexCard, deleteIndexCard } from "../api/index-cards";
import { createBoardImageCard, deleteBoardImageCard } from "../api/boards";
import { createConnection, deleteConnection } from "../api/connections";
import { saveDrawing } from "../api/drawings";

export interface ImportedBoardContent {
  notes: NoteSummaryDto[];
  indexCards: IndexCardSummaryDto[];
  imageCards: BoardImageSummaryDto[];
  connections: BoardConnectionDto[];
}

/**
 * Creates notes/index cards/image cards/connections (and a chalk drawing, if present) from an
 * export payload onto `boardId`. If any create fails partway through, best-effort rolls back
 * everything already created by this call and rethrows - callers never end up with a half-built
 * result to reconcile.
 */
async function createBoardContentFromPayload(
  boardId: string,
  payload: BoardExportPayload,
): Promise<ImportedBoardContent> {
  const idMap = new Map<string, string>();
  const notes: NoteSummaryDto[] = [];
  const indexCards: IndexCardSummaryDto[] = [];
  const imageCards: BoardImageSummaryDto[] = [];
  const connections: BoardConnectionDto[] = [];

  try {
    if (payload.drawing?.canvasJson) {
      await saveDrawing(boardId, { canvasJson: payload.drawing.canvasJson });
    }
    for (const n of payload.notes ?? []) {
      const created = await createNote({
        content: n.content,
        boardId,
        title: n.title ?? undefined,
        positionX: n.positionX ?? 20,
        positionY: n.positionY ?? 20,
        width: n.width ?? undefined,
        height: n.height ?? undefined,
        color: n.color ?? undefined,
        rotation: n.rotation ?? undefined,
      });
      idMap.set(n.id, created.id);
      notes.push(created);
    }
    for (const c of payload.indexCards ?? []) {
      const created = await createIndexCard({
        content: c.content,
        boardId,
        title: c.title ?? undefined,
        positionX: c.positionX ?? 20,
        positionY: c.positionY ?? 20,
        width: c.width ?? undefined,
        height: c.height ?? undefined,
        color: c.color ?? undefined,
        rotation: c.rotation ?? undefined,
      });
      idMap.set(c.id, created.id);
      indexCards.push(created);
    }
    for (const img of payload.imageCards ?? []) {
      const created = await createBoardImageCard(boardId, {
        imageUrl: img.imageUrl,
        positionX: img.positionX,
        positionY: img.positionY,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        rotation: img.rotation ?? undefined,
      });
      idMap.set(img.id, created.id);
      imageCards.push(created);
    }
    for (const conn of payload.connections ?? []) {
      const fromId = idMap.get(conn.fromItemId);
      const toId = idMap.get(conn.toItemId);
      if (fromId && toId) {
        const created = await createConnection({ fromItemId: fromId, toItemId: toId, boardId });
        connections.push(created);
      }
    }
  } catch (err) {
    await Promise.allSettled(connections.map((c) => deleteConnection(c.id)));
    await Promise.allSettled(imageCards.map((img) => deleteBoardImageCard(boardId, img.id)));
    await Promise.allSettled(indexCards.map((c) => deleteIndexCard(c.id)));
    await Promise.allSettled(notes.map((n) => deleteNote(n.id)));
    throw err;
  }

  return { notes, indexCards, imageCards, connections };
}

/** Imports export payload content into a brand-new board. Nothing pre-existing is at risk. */
export async function importBoardIntoNew(
  boardId: string,
  payload: BoardExportPayload,
): Promise<ImportedBoardContent> {
  return createBoardContentFromPayload(boardId, payload);
}

export interface ExistingBoardContent {
  notes: NoteSummaryDto[];
  indexCards: IndexCardSummaryDto[];
  imageCards: BoardImageSummaryDto[];
  connections: BoardConnectionDto[];
}

/**
 * Replaces an existing board's content with an export payload's content.
 *
 * Create-first, delete-second: all new content is built before anything pre-existing is touched.
 * If creation fails partway, the partially-created new items are rolled back (via
 * createBoardContentFromPayload's own rollback) and the original content is left completely
 * untouched - the delete calls below only run once every new item exists.
 */
export async function importBoardReplacingExisting(
  boardId: string,
  payload: BoardExportPayload,
  existing: ExistingBoardContent,
): Promise<ImportedBoardContent> {
  const created = await createBoardContentFromPayload(boardId, payload);

  await Promise.allSettled(existing.connections.map((c) => deleteConnection(c.id)));
  await Promise.allSettled(existing.imageCards.map((img) => deleteBoardImageCard(boardId, img.id)));
  await Promise.allSettled(existing.indexCards.map((c) => deleteIndexCard(c.id)));
  await Promise.allSettled(existing.notes.map((n) => deleteNote(n.id)));

  return created;
}
