import type {
  UserProfileDto,
  UpdateProfileRequest,
  UserPreferencesDto,
  UpdatePreferencesRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
  UserPublicDto,
  FriendDto,
  FriendRequestDto,
  SentFriendRequestDto,
  FriendStatusDto,
  SendFriendRequestRequest,
  UpdatePresenceRequest,
} from "../types";
import { apiClient } from "./client";

export async function getProfile(): Promise<UserProfileDto> {
  const response = await apiClient.get<UserProfileDto>("/users/me");
  return response.data;
}

export async function postPresence(data: UpdatePresenceRequest): Promise<void> {
  await apiClient.post("/users/me/presence", data);
}

export async function getPublicProfile(userId: string): Promise<UserPublicDto | null> {
  try {
    const response = await apiClient.get<UserPublicDto>(`/users/${userId}`);
    return response.data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

export async function getPublicProfileByUsername(username: string): Promise<UserPublicDto | null> {
  try {
    const response = await apiClient.get<UserPublicDto>(`/users/by-username/${encodeURIComponent(username)}`);
    return response.data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

export async function searchUsers(q: string, limit = 20): Promise<UserPublicDto[]> {
  const response = await apiClient.get<UserPublicDto[]>("/users/search", {
    params: { q: q.trim() || undefined, limit },
  });
  return response.data ?? [];
}

export async function getFriends(): Promise<FriendDto[]> {
  const response = await apiClient.get<FriendDto[]>("/users/me/friends");
  return response.data ?? [];
}

export async function getFriendsOfUser(userId: string): Promise<FriendDto[]> {
  try {
    const response = await apiClient.get<FriendDto[]>(`/users/${userId}/friends`);
    return response.data ?? [];
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return [];
    throw err;
  }
}

export async function getFriendsOfUserByUsername(username: string): Promise<FriendDto[]> {
  try {
    const response = await apiClient.get<FriendDto[]>(`/users/by-username/${encodeURIComponent(username)}/friends`);
    return response.data ?? [];
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return [];
    throw err;
  }
}

export async function getPendingFriendRequests(): Promise<FriendRequestDto[]> {
  const response = await apiClient.get<FriendRequestDto[]>("/users/me/friend-requests");
  return response.data ?? [];
}

export async function getPendingSentFriendRequests(): Promise<SentFriendRequestDto[]> {
  const response = await apiClient.get<SentFriendRequestDto[]>("/users/me/friend-requests/sent");
  return response.data ?? [];
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await apiClient.post(`/users/me/friend-requests/${requestId}/cancel`);
}

export async function getFriendStatus(userId: string): Promise<FriendStatusDto> {
  const response = await apiClient.get<FriendStatusDto>("/users/me/friend-requests/status", {
    params: { userId },
  });
  return response.data;
}

export async function sendFriendRequest(data: SendFriendRequestRequest): Promise<void> {
  await apiClient.post("/users/me/friend-requests", data);
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await apiClient.post(`/users/me/friend-requests/${requestId}/accept`);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await apiClient.post(`/users/me/friend-requests/${requestId}/reject`);
}

export async function removeFriend(friendId: string): Promise<void> {
  await apiClient.delete(`/users/me/friends/${friendId}`);
}

export async function updateProfile(data: UpdateProfileRequest): Promise<void> {
  await apiClient.put("/users/me", data);
}

export async function getPreferences(): Promise<UserPreferencesDto> {
  const response = await apiClient.get<UserPreferencesDto>("/users/me/preferences");
  return response.data;
}

export async function updatePreferences(data: UpdatePreferencesRequest): Promise<void> {
  await apiClient.put("/users/me/preferences", data);
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await apiClient.put("/users/me/password", data);
}

export async function deleteAccount(data?: DeleteAccountRequest): Promise<void> {
  await apiClient.delete("/users/me", { data });
}
