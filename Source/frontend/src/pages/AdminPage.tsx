import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserCog,
  Ban,
  X,
} from "lucide-react";
import {
  getAdminStats,
  getAdminAnalytics,
  getAdminUsers,
  getAdminUserDetail,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  removeUserFriend,
  deleteAdminProject,
  deleteAdminBoard,
  deleteAdminNotebook,
} from "../api/admin";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import type {
  AdminStatsDto,
  AdminAnalyticsDto,
  AdminUserDto,
  AdminUserDetailDto,
  AdminUserListQuery,
} from "../types";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "User", label: "User" },
  { value: "Admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "true", label: "Active" },
  { value: "false", label: "Banned" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function AdminPage() {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalyticsDto | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailUser, setDetailUser] = useState<AdminUserDetailDto | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string } | null>(null);
  const [roleEditUserId, setRoleEditUserId] = useState<string | null>(null);
  const [roleEditValue, setRoleEditValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [unaddingFriendId, setUnaddingFriendId] = useState<string | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteNotebookTarget, setDeleteNotebookTarget] = useState<{ id: string; name: string } | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const data = await getAdminStats();
      setStats(data);
    } catch {
      setError("Failed to load stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch {
      // Non-blocking; analytics are supplementary
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);
      const query: AdminUserListQuery = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        role: roleFilter || undefined,
        isActive:
          isActiveFilter === ""
            ? undefined
            : isActiveFilter === "true",
      };
      const result = await getAdminUsers(query);
      setUsers(result.items);
      setTotal(result.total);
    } catch {
      setError("Failed to load users.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, isActiveFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openDetail = useCallback(async (id: string) => {
    setDetailUserId(id);
    setDetailUser(null);
    setDetailError(null);
    setIsLoadingDetail(true);
    try {
      const data = await getAdminUserDetail(id);
      setDetailUser(data);
      setRoleEditValue(data.role);
    } catch {
      setDetailError("Failed to load user.");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  function closeDetail() {
    setDetailUserId(null);
    setDetailUser(null);
    setDetailError(null);
    setRoleEditUserId(null);
    setActionError(null);
  }

  async function handleBan(id: string, isActive: boolean) {
    setActionError(null);
    try {
      await updateUserStatus(id, { isActive });
      if (detailUserId === id && detailUser) {
        setDetailUser({ ...detailUser, isActive });
      }
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to update status."
      );
    }
  }

  async function handleChangeRole(id: string, role: string) {
    setActionError(null);
    try {
      await updateUserRole(id, { role });
      if (detailUserId === id && detailUser) {
        setDetailUser({ ...detailUser, role });
      }
      setRoleEditUserId(null);
      fetchUsers();
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to update role."
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteUser(id);
      if (detailUserId === id) closeDetail();
      fetchUsers();
      fetchStats();
    } catch {
      setActionError("Failed to delete user.");
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  const maxBarValue = stats
    ? Math.max(
        stats.totalUsers,
        stats.activeUsersCount,
        stats.usersActiveLast24h,
        stats.usersActiveLast7d,
        1
      )
    : 1;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Admin header strip - distinct but on-theme */}
      <div className="border-b border-border/60 bg-gradient-to-r from-slate-100 to-violet-50/50 dark:from-slate-900/80 dark:to-violet-950/20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200/60 bg-white shadow-sm dark:border-violet-800/40 dark:bg-slate-800/60">
              <ShieldCheck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-foreground/60">
                User statistics, activity, and management
              </p>
            </div>
            <span className="ml-auto rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200">
              Admin
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats cards - compact admin style */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isLoadingStats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-surface/60 p-4"
                >
                  <div className="h-8 w-20 animate-pulse rounded bg-foreground/10" />
                </div>
              ))
            ) : stats ? (
              <>
                <div className="rounded-lg border border-border/50 bg-surface/60 p-4 shadow-sm transition-shadow hover:shadow">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Total users
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/60 p-4 shadow-sm transition-shadow hover:shadow">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Active accounts
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                    {stats.activeUsersCount}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/60 p-4 shadow-sm transition-shadow hover:shadow">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Active (24h)
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {stats.usersActiveLast24h}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/60 p-4 shadow-sm transition-shadow hover:shadow">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Active (7d)
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                    {stats.usersActiveLast7d}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* User Activity graphs */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            User Activity
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar chart - Activity comparison */}
            <div className="rounded-lg border border-border/50 bg-surface/60 p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-foreground/80">
                Activity comparison
              </h3>
              {stats && (
                <div className="space-y-4">
                  {[
                    {
                      label: "Total users",
                      value: stats.totalUsers,
                      color: "bg-slate-400 dark:bg-slate-500",
                    },
                    {
                      label: "Active accounts",
                      value: stats.activeUsersCount,
                      color: "bg-violet-400 dark:bg-violet-500",
                    },
                    {
                      label: "Active in last 7 days",
                      value: stats.usersActiveLast7d,
                      color: "bg-amber-400 dark:bg-amber-500",
                    },
                    {
                      label: "Active in last 24 hours",
                      value: stats.usersActiveLast24h,
                      color: "bg-emerald-500 dark:bg-emerald-400",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-xs text-foreground/70">
                        {item.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="h-7 overflow-hidden rounded-md bg-foreground/[0.06] dark:bg-foreground/10">
                          <div
                            className={`h-full rounded-md ${item.color} transition-[width] duration-500 ease-spring motion-reduce:transition-none`}
                            style={{
                              width: `${Math.round((item.value / maxBarValue) * 100)}%`,
                              minWidth: item.value > 0 ? "4px" : "0",
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {!stats && !isLoadingStats && (
                <p className="py-8 text-center text-sm text-foreground/50">
                  No data
                </p>
              )}
            </div>

            {/* Activity distribution (visual funnel) */}
            <div className="rounded-lg border border-border/50 bg-surface/60 p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-foreground/80">
                Activity distribution
              </h3>
              {stats && stats.totalUsers > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/60">All users</span>
                    <span className="font-medium tabular-nums">
                      {stats.totalUsers}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/60">Active (7d)</span>
                    <span className="font-medium tabular-nums text-violet-600 dark:text-violet-400">
                      {stats.usersActiveLast7d}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-violet-400 dark:bg-violet-500 transition-[width] duration-500 ease-spring motion-reduce:transition-none"
                      style={{
                        width: `${Math.round((stats.usersActiveLast7d / stats.totalUsers) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/60">Active (24h)</span>
                    <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      {stats.usersActiveLast24h}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-[width] duration-500 ease-spring motion-reduce:transition-none"
                      style={{
                        width: `${Math.round((stats.usersActiveLast24h / stats.totalUsers) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {(!stats || stats.totalUsers === 0) && !isLoadingStats && (
                <p className="py-8 text-center text-sm text-foreground/50">
                  No data
                </p>
              )}
            </div>
          </div>

          {/* Pie chart + User creation + User logins */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Pie chart: User Activity */}
            <div className="rounded-lg border border-border/50 bg-surface/60 p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-foreground/80">
                User Activity
              </h3>
              {isLoadingAnalytics ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : analytics?.creationCounts ? (
                (() => {
                  const c = analytics.creationCounts;
                  const total =
                    c.eventsCount +
                    c.noteBoardsCount +
                    c.chalkBoardsCount +
                    c.notebooksCount;
                  if (total === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-foreground/50">
                        No creations yet
                      </p>
                    );
                  }
                  const p1 = (c.eventsCount / total) * 100;
                  const p2 = (c.noteBoardsCount / total) * 100;
                  const p3 = (c.chalkBoardsCount / total) * 100;
                  const p4 = (c.notebooksCount / total) * 100;
                  const conic = `conic-gradient(
                    #10b981 0% ${p1}%,
                    #8b5cf6 ${p1}% ${p1 + p2}%,
                    #f59e0b ${p1 + p2}% ${p1 + p2 + p3}%,
                    #3b82f6 ${p1 + p2 + p3}% ${p1 + p2 + p3 + p4}%
                  )`;
                  const segments = [
                    { label: "Events", count: c.eventsCount, color: "bg-emerald-500" },
                    { label: "Note boards", count: c.noteBoardsCount, color: "bg-violet-500" },
                    { label: "Chalk boards", count: c.chalkBoardsCount, color: "bg-amber-500" },
                    { label: "Notebooks", count: c.notebooksCount, color: "bg-blue-500" },
                  ];
                  return (
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <div
                        className="h-36 w-36 shrink-0 rounded-full border-4 border-white shadow-inner dark:border-slate-800"
                        style={{ background: conic }}
                      />
                      <ul className="min-w-0 space-y-1.5 text-xs">
                        {segments.map((s) => (
                          <li
                            key={s.label}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${s.color}`}
                              />
                              {s.label}
                            </span>
                            <span className="tabular-nums font-medium">
                              {s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()
              ) : (
                <p className="py-8 text-center text-sm text-foreground/50">
                  No data
                </p>
              )}
            </div>

            {/* User creation by month */}
            <div className="rounded-lg border border-border/50 bg-surface/60 p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-foreground/80">
                User Creation Activity
              </h3>
              {isLoadingAnalytics ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : analytics?.userCreationByMonth?.length ? (
                (() => {
                  const data = analytics.userCreationByMonth;
                  const maxCount = Math.max(
                    1,
                    ...data.map((d) => d.count)
                  );
                  return (
                    <div className="flex h-48 flex-col">
                      <div className="flex min-h-0 flex-1 items-end justify-between gap-0.5">
                        {data.map((d) => (
                          <div
                            key={d.period}
                            className="flex h-full flex-1 flex-col justify-end"
                            title={`${d.period}: ${d.count}`}
                          >
                            <div
                              className="w-full min-w-0 rounded-t bg-violet-500 transition-[height,colors] duration-300 ease-spring hover:bg-violet-600 dark:bg-violet-500 dark:hover:bg-violet-400 motion-reduce:transition-none"
                              style={{
                                height: `${Math.round((d.count / maxCount) * 100)}%`,
                                minHeight: d.count > 0 ? "4px" : "0",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex shrink-0 justify-between gap-0.5 pt-1">
                        {data.map((d) => (
                          <span
                            key={d.period}
                            className="flex-1 truncate text-center text-[10px] text-foreground/50"
                          >
                            {d.period.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="py-8 text-center text-sm text-foreground/50">
                  No data
                </p>
              )}
            </div>

            {/* User logins by month */}
            <div className="rounded-lg border border-border/50 bg-surface/60 p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-foreground/80">
                User Login Activity
              </h3>
              {isLoadingAnalytics ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : analytics?.userLoginsByMonth?.length ? (
                (() => {
                  const data = analytics.userLoginsByMonth;
                  const maxCount = Math.max(
                    1,
                    ...data.map((d) => d.count)
                  );
                  return (
                    <div className="flex h-48 flex-col">
                      <div className="flex min-h-0 flex-1 items-end justify-between gap-0.5">
                        {data.map((d) => (
                          <div
                            key={d.period}
                            className="flex h-full flex-1 flex-col justify-end"
                            title={`${d.period}: ${d.count} logins`}
                          >
                            <div
                              className="w-full min-w-0 rounded-t bg-emerald-500 transition-[height,colors] duration-300 ease-spring hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
                              style={{
                                height: `${Math.round((d.count / maxCount) * 100)}%`,
                                minHeight: d.count > 0 ? "4px" : "0",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex shrink-0 justify-between gap-0.5 pt-1">
                        {data.map((d) => (
                          <span
                            key={d.period}
                            className="flex-1 truncate text-center text-[10px] text-foreground/50"
                          >
                            {d.period.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="py-8 text-center text-sm text-foreground/50">
                  No data
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Users list */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            User management
          </h2>
        <div className="overflow-hidden rounded-lg border border-border/50 bg-surface/60 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/50 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={isActiveFilter}
              onChange={(e) => {
                setIsActiveFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-500">{error}</div>
          )}

          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-foreground/50">
              No users found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-foreground/60">
                      <th className="p-3 font-medium">Username</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Role</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Created</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isCurrentUser = u.id === authUser?.userId;
                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-border/30 hover:bg-foreground/[0.02] ${
                            isCurrentUser
                              ? "bg-amber-50/80 dark:bg-amber-950/30 border-l-2 border-l-amber-500 dark:border-l-amber-400"
                              : ""
                          }`}
                        >
                          <td className="p-3 font-medium text-foreground">
                            {u.username}
                            {isCurrentUser && (
                              <span className="ml-2 inline-flex rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-800/60 dark:text-amber-200">
                                You
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-foreground/80">{u.email}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.role === "Admin"
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                                : "bg-foreground/10 text-foreground/80"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              u.isActive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {u.isActive ? "Active" : "Banned"}
                          </span>
                        </td>
                        <td className="p-3 text-foreground/60">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(u.id)}
                            className="rounded-lg px-2 py-1 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <p className="text-xs text-foreground/50">
                  {total} user{total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg p-2 text-foreground/60 hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-foreground/70">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg p-2 text-foreground/60 hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </section>
      </div>

      {/* User detail modal */}
      {detailUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDetail}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeDetail}
              className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : detailError ? (
              <p className="py-8 text-center text-sm text-red-500">{detailError}</p>
            ) : detailUser ? (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {detailUser.username}
                    </h2>
                    <Link
                      to={`/profile/${encodeURIComponent(detailUser.username)}`}
                      className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
                    >
                      View profile
                    </Link>
                  </div>
                  <p className="text-sm text-foreground/60">{detailUser.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        detailUser.role === "Admin"
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                          : "bg-foreground/10 text-foreground/80"
                      }`}
                    >
                      {detailUser.role}
                    </span>
                    <span
                      className={
                        detailUser.isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {detailUser.isActive ? "Active" : "Banned"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/50">
                    Joined {new Date(detailUser.createdAt).toLocaleDateString()}
                    {detailUser.lastLoginAt &&
                      ` · Last login ${new Date(detailUser.lastLoginAt).toLocaleString()}`}
                  </p>
                </div>

                {/* Friends */}
                <div>
                  <h3 className="text-sm font-medium text-foreground/80">Friends</h3>
                  {detailUser.friends.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/50">No friends</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {detailUser.friends.map((f) => (
                        <li
                          key={f.userId}
                          className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-foreground/5"
                        >
                          <Link
                            to={`/profile/${encodeURIComponent(f.username)}`}
                            className="flex-1 truncate text-sm text-primary hover:underline"
                          >
                            {f.username}
                          </Link>
                          <button
                            type="button"
                            disabled={unaddingFriendId === f.userId}
                            onClick={async () => {
                              setActionError(null);
                              setUnaddingFriendId(f.userId);
                              try {
                                await removeUserFriend(detailUser.id, f.userId);
                                const updated = await getAdminUserDetail(detailUser.id);
                                setDetailUser(updated);
                              } catch {
                                setActionError("Failed to unadd friend.");
                              } finally {
                                setUnaddingFriendId(null);
                              }
                            }}
                            title="Unadd friend"
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            {unaddingFriendId === f.userId ? "…" : "Unadd"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Projects */}
                <div>
                  <h3 className="text-sm font-medium text-foreground/80">Projects</h3>
                  {!detailUser.projects || detailUser.projects.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/50">No projects</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {detailUser.projects.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-foreground/5"
                        >
                          <Link
                            to={`/projects/${p.id}`}
                            className="flex-1 truncate text-sm text-primary hover:underline"
                          >
                            {p.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteProjectTarget({ id: p.id, name: p.name })}
                            title="Delete project"
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Boards */}
                <div>
                  <h3 className="text-sm font-medium text-foreground/80">Boards</h3>
                  {!detailUser.boards || detailUser.boards.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/50">No boards</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {detailUser.boards.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-foreground/5"
                        >
                          <Link
                            to={b.boardType === "ChalkBoard" ? `/chalkboards/${b.id}` : `/boards/${b.id}`}
                            className="flex-1 truncate text-sm text-primary hover:underline"
                          >
                            {b.name}
                            {b.boardType === "ChalkBoard" && (
                              <span className="ml-1 text-xs text-foreground/50">(Chalk)</span>
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteBoardTarget({ id: b.id, name: b.name })}
                            title="Delete board"
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Notebooks */}
                <div>
                  <h3 className="text-sm font-medium text-foreground/80">Notebooks</h3>
                  {!detailUser.notebooks || detailUser.notebooks.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/50">No notebooks</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {detailUser.notebooks.map((n) => (
                        <li
                          key={n.id}
                          className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-foreground/5"
                        >
                          <span className="flex-1 truncate text-sm text-foreground">{n.name}</span>
                          <button
                            type="button"
                            onClick={() => setDeleteNotebookTarget({ id: n.id, name: n.name })}
                            title="Delete notebook"
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {actionError && (
                  <p className="text-sm text-red-500">{actionError}</p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
                  {detailUser.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleBan(detailUser.id, false)}
                      disabled={detailUser.role === "Admin"}
                      title={detailUser.role === "Admin" ? "Cannot ban admin accounts" : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
                    >
                      <Ban className="h-4 w-4" />
                      Ban access
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBan(detailUser.id, true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/60"
                    >
                      Restore access
                    </button>
                  )}

                  {roleEditUserId === detailUser.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={roleEditValue}
                        onChange={(e) => setRoleEditValue(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleChangeRole(detailUser.id, roleEditValue)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRoleEditUserId(null);
                          setRoleEditValue(detailUser.role);
                        }}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-foreground/5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRoleEditUserId(detailUser.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-foreground/15"
                    >
                      <UserCog className="h-4 w-4" />
                      Change role
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ id: detailUser.id, username: detailUser.username })
                    }
                    disabled={
                      authUser?.userId === detailUser.id || detailUser.role === "Admin"
                    }
                    title={
                      authUser?.userId === detailUser.id
                        ? "Cannot delete yourself"
                        : detailUser.role === "Admin"
                          ? "Cannot delete admin accounts"
                          : undefined
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete user confirm */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete user"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.username}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete project confirm */}
      <ConfirmDialog
        isOpen={deleteProjectTarget !== null}
        title="Delete project"
        message={
          deleteProjectTarget
            ? `Are you sure you want to permanently delete the project "${deleteProjectTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (!deleteProjectTarget || !detailUser) return;
          setActionError(null);
          try {
            await deleteAdminProject(deleteProjectTarget.id);
            const updated = await getAdminUserDetail(detailUser.id);
            setDetailUser(updated);
          } catch {
            setActionError("Failed to delete project.");
          } finally {
            setDeleteProjectTarget(null);
          }
        }}
        onCancel={() => setDeleteProjectTarget(null)}
      />

      {/* Delete board confirm */}
      <ConfirmDialog
        isOpen={deleteBoardTarget !== null}
        title="Delete board"
        message={
          deleteBoardTarget
            ? `Are you sure you want to permanently delete the board "${deleteBoardTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (!deleteBoardTarget || !detailUser) return;
          setActionError(null);
          try {
            await deleteAdminBoard(deleteBoardTarget.id);
            const updated = await getAdminUserDetail(detailUser.id);
            setDetailUser(updated);
          } catch {
            setActionError("Failed to delete board.");
          } finally {
            setDeleteBoardTarget(null);
          }
        }}
        onCancel={() => setDeleteBoardTarget(null)}
      />

      {/* Delete notebook confirm */}
      <ConfirmDialog
        isOpen={deleteNotebookTarget !== null}
        title="Delete notebook"
        message={
          deleteNotebookTarget
            ? `Are you sure you want to permanently delete the notebook "${deleteNotebookTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (!deleteNotebookTarget || !detailUser) return;
          setActionError(null);
          try {
            await deleteAdminNotebook(deleteNotebookTarget.id);
            const updated = await getAdminUserDetail(detailUser.id);
            setDetailUser(updated);
          } catch {
            setActionError("Failed to delete notebook.");
          } finally {
            setDeleteNotebookTarget(null);
          }
        }}
        onCancel={() => setDeleteNotebookTarget(null)}
      />
    </div>
  );
}
