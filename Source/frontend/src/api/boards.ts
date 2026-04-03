import axios from "axios";
import type {
  BoardImageSummaryDto,
  BoardSummaryDto,
  CreateBoardImageRequest,
  CreateBoardRequest,
  PaginatedResponse,
  PatchBoardImageRequest,
  UpdateBoardRequest,
} from "../types";
import { apiClient } from "./client";

export async function getBoards(params?: Record<string, string | number>): Promise<PaginatedResponse<BoardSummaryDto>> {
  const response = await apiClient.get<PaginatedResponse<BoardSummaryDto>>("/boards", { params });
  return response.data;
}

export async function getBoardById(id: string): Promise<BoardSummaryDto> {
  const response = await apiClient.get<BoardSummaryDto>(`/boards/${id}`);
  return response.data;
}

export async function createBoard(data: CreateBoardRequest): Promise<BoardSummaryDto> {
  const response = await apiClient.post<BoardSummaryDto>("/boards", data);
  return response.data;
}

export async function updateBoard(id: string, data: UpdateBoardRequest): Promise<void> {
  await apiClient.put(`/boards/${id}`, data);
}

export async function deleteBoard(id: string): Promise<void> {
  await apiClient.delete(`/boards/${id}`);
}

export async function toggleBoardPin(id: string, isPinned: boolean): Promise<void> {
  await apiClient.put(`/boards/${id}/pin`, { isPinned });
}

export async function getPinnedBoards(): Promise<BoardSummaryDto[]> {
  const response = await apiClient.get<BoardSummaryDto[]>("/boards/pinned");
  return response.data;
}

/** Upload an image file for a board. Returns the image URL. */
export async function uploadBoardImage(boardId: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ url: string }>(`/boards/${boardId}/images`, formData);
  return response.data;
}

/** Get all image cards on a board. */
export async function getBoardImageCards(boardId: string): Promise<BoardImageSummaryDto[]> {
  try {
    const response = await apiClient.get<BoardImageSummaryDto[]>(`/boards/${boardId}/image-cards`);
    return response.data;
  } catch (e: unknown) {
    // 503 = DB missing BoardImages table (schema not migrated). Board still works without image cards.
    if (axios.isAxiosError(e) && e.response?.status === 503) {
      return [];
    }
    throw e;
  }
}

/** Create an image card on a board. */
export async function createBoardImageCard(
  boardId: string,
  data: CreateBoardImageRequest
): Promise<BoardImageSummaryDto> {
  const response = await apiClient.post<BoardImageSummaryDto>(`/boards/${boardId}/image-cards`, data);
  return response.data;
}

/** Patch an image card. */
export async function patchBoardImageCard(
  boardId: string,
  id: string,
  data: PatchBoardImageRequest
): Promise<void> {
  await apiClient.patch(`/boards/${boardId}/image-cards/${id}`, data);
}

/** Delete an image card. */
export async function deleteBoardImageCard(boardId: string, id: string): Promise<void> {
  await apiClient.delete(`/boards/${boardId}/image-cards/${id}`);
}
