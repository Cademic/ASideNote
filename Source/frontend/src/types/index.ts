// --- Auth DTOs ---

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  profilePictureKey?: string | null;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  profilePictureKey?: string | null;
  role?: string;
}

// --- User profile & preferences ---

export interface UserProfileDto {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  profilePictureKey: string | null;
  bio: string | null;
  usernameChangedAt: string | null;
}

export interface UpdateProfileRequest {
  username: string;
  email: string;
  profilePictureKey?: string | null;
  bio?: string | null;
}

export interface UserPreferencesDto {
  theme: string;
  emailNotifications: string | null;
}

export interface UpdatePreferencesRequest {
  theme: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountRequest {
  password?: string;
}

// --- Friends ---

export interface UserPublicDto {
  id: string;
  username: string;
  profilePictureKey: string | null;
  bio: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  friendCount?: number;
  role?: string | null;
}

export interface FriendDto {
  id: string;
  username: string;
  profilePictureKey: string | null;
  lastLoginAt: string | null;
}

export interface FriendRequestDto {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterProfilePictureKey: string | null;
  createdAt: string;
  status: number;
}

export interface SentFriendRequestDto {
  id: string;
  receiverId: string;
  receiverUsername: string;
  receiverProfilePictureKey: string | null;
  createdAt: string;
}

export interface FriendStatusDto {
  status: "None" | "PendingSent" | "PendingReceived" | "Friends" | "Self";
}

export interface SendFriendRequestRequest {
  receiverId: string;
}

// --- Board DTOs ---

export interface BoardSummaryDto {
  id: string;
  name: string;
  description: string | null;
  boardType: string;
  projectId: string | null;
  projectFolderId?: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  noteCount: number;
  indexCardCount: number;
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
  boardType: string;
  projectId?: string;
}

export interface UpdateBoardRequest {
  name: string;
  description?: string;
}

// --- Notebook DTOs ---

export interface NotebookSummaryDto {
  id: string;
  name: string;
  projectId?: string | null;
  projectFolderId?: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookDetailDto {
  id: string;
  name: string;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  projectFolderId?: string | null;
  contentJson: string;
}

export interface CreateNotebookRequest {
  name: string;
  projectId?: string;
}

export interface UpdateNotebookRequest {
  name: string;
}

export interface UpdateNotebookContentRequest {
  contentJson: string;
  /** Optional: last known updatedAt for optimistic concurrency. If server version differs, API returns 409. */
  updatedAt?: string;
}

export interface NotebookVersionDto {
  id: string;
  notebookId: string;
  createdAt: string;
  label: string | null;
  contentJson?: string;
}

export interface CreateNotebookVersionRequest {
  label?: string;
}

// --- Note DTOs ---

export interface NoteTagDto {
  id: string;
  name: string;
  color: string | null;
}

export interface NoteSummaryDto {
  id: string;
  title: string | null;
  content: string;
  folderId: string | null;
  projectId: string | null;
  tags: NoteTagDto[];
  createdAt: string;
  updatedAt: string;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  color: string | null;
  rotation: number | null;
}

export interface NoteDetailDto extends NoteSummaryDto {
  lastSavedAt: string | null;
}

export interface CreateNoteRequest {
  title?: string;
  content: string;
  folderId?: string;
  projectId?: string;
  boardId?: string;
  tagIds?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}

export interface PatchNoteRequest {
  title?: string | null;
  patchTitle?: boolean;
  content?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Board Connections ---

export interface BoardConnectionDto {
  id: string;
  fromItemId: string;
  toItemId: string;
  createdAt: string;
}

export interface CreateBoardConnectionRequest {
  fromItemId: string;
  toItemId: string;
  boardId?: string;
}

// --- Board Export (save/load to file) ---

export interface BoardExportPayload {
  version: 1;
  boardType: "NoteBoard" | "ChalkBoard";
  boardName: string;
  exportedAt: string;
  notes?: NoteSummaryDto[];
  indexCards?: IndexCardSummaryDto[];
  imageCards?: BoardImageSummaryDto[];
  connections?: BoardConnectionDto[];
  drawing?: { canvasJson: string };
  viewport?: { zoom: number; panX: number; panY: number };
}

// --- Board Image Card DTOs ---

export interface BoardImageSummaryDto {
  id: string;
  imageUrl: string;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  rotation: number | null;
}

export interface CreateBoardImageRequest {
  imageUrl: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface PatchBoardImageRequest {
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

// --- Index Card DTOs ---

export interface IndexCardSummaryDto {
  id: string;
  title: string | null;
  content: string;
  folderId: string | null;
  projectId: string | null;
  tags: NoteTagDto[];
  createdAt: string;
  updatedAt: string;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  color: string | null;
  rotation: number | null;
}

export interface IndexCardDetailDto extends IndexCardSummaryDto {
  lastSavedAt: string | null;
}

export interface CreateIndexCardRequest {
  title?: string;
  content: string;
  folderId?: string;
  projectId?: string;
  boardId?: string;
  tagIds?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}

export interface PatchIndexCardRequest {
  title?: string | null;
  patchTitle?: boolean;
  content?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}

// --- Drawing DTOs ---

export interface DrawingDto {
  id: string;
  boardId: string;
  canvasJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDrawingRequest {
  canvasJson: string;
}

// --- Project DTOs ---

export interface ProjectSummaryDto {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  status: string;
  progress: number;
  color: string;
  ownerId: string;
  ownerUsername: string;
  userRole: string;
  memberCount: number;
  boardCount: number;
  createdAt: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  /** Legacy; treated as on. Use myShowOnPersonalCalendar to opt out. */
  showEventsOnMainCalendar?: boolean;
  /** Per-user timeline; null means show. */
  myShowOnPersonalCalendar?: boolean | null;
}

export interface ProjectMemberDto {
  userId: string;
  username: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface ProjectFolderDto {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectFolderRequest {
  name: string;
  sortOrder?: number | null;
}

export interface UpdateProjectFolderRequest {
  name?: string;
  sortOrder?: number | null;
}

export interface SetProjectItemFolderRequest {
  folderId: string | null;
}

export interface ProjectDetailDto {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  status: string;
  progress: number;
  /** When true, progress follows start/end dates (linear by day). */
  autoProgressEnabled?: boolean;
  color: string;
  showEventsOnMainCalendar?: boolean;
  /** Per-user timeline; null means show (default on). */
  myShowOnPersonalCalendar?: boolean | null;
  ownerId: string;
  ownerUsername: string;
  userRole: string;
  createdAt: string;
  members: ProjectMemberDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  notes: NoteSummaryDto[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  color?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  status: string;
  progress: number;
  /** Omit for partial updates (e.g. rename); server keeps current value when unset. */
  autoProgressEnabled?: boolean;
  color?: string;
  showEventsOnMainCalendar?: boolean;
}

export interface AddMemberRequest {
  email?: string;
  userId?: string;
  role: string;
}

export interface UpdateMemberRoleRequest {
  role: string;
}

export interface UpdateMyProjectCalendarPreferenceRequest {
  showOnPersonalCalendar: boolean | null;
}

// --- Calendar Event DTOs ---

export interface CalendarEventDto {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  /** Set by API when the event is linked to a project (for display when the project list map misses). */
  projectName?: string | null;
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  color: string;
  eventType: string;
  recurrenceFrequency: string | null;
  recurrenceInterval: number;
  recurrenceEndDate: string | null;
  recurrenceSourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  projectId?: string;
  startDate: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
  eventType?: string;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

export interface UpdateCalendarEventRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
  eventType?: string;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

// --- Admin DTOs ---

export interface AdminStatsDto {
  totalUsers: number;
  activeUsersCount: number;
  usersActiveLast24h: number;
  usersActiveLast7d: number;
}

export interface AdminUserStatsDto {
  noteCount: number;
  projectCount: number;
}

export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  stats: AdminUserStatsDto;
}

export interface AdminFriendDto {
  userId: string;
  username: string;
  lastLoginAt: string | null;
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
}

export interface AdminBoardSummaryDto {
  id: string;
  name: string;
  description: string | null;
  boardType: string;
  projectId: string | null;
  createdAt: string;
}

export interface AdminNotebookSummaryDto {
  id: string;
  name: string;
  projectId: string | null;
  createdAt: string;
}

export interface AdminUserDetailDto {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  stats: AdminUserStatsDto;
  notes: NoteSummaryDto[];
  projects: ProjectSummaryDto[];
  boards: AdminBoardSummaryDto[];
  notebooks: AdminNotebookSummaryDto[];
  activityLog: AuditLogDto[];
  friends: AdminFriendDto[];
}

export interface AdminUserListQuery {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
  reason?: string | null;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface AdminCreationCountsDto {
  eventsCount: number;
  noteBoardsCount: number;
  chalkBoardsCount: number;
  notebooksCount: number;
}

export interface AdminPeriodCountDto {
  period: string;
  count: number;
}

export interface AdminAnalyticsDto {
  creationCounts: AdminCreationCountsDto;
  userCreationByMonth: AdminPeriodCountDto[];
  userLoginsByMonth: AdminPeriodCountDto[];
}
