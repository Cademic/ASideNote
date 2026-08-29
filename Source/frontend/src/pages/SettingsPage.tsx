import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Save, Loader2, LogOut, Trash2, Lock } from "lucide-react";
import { getProfile, updateProfile, getPreferences, updatePreferences, changePassword as changePasswordApi, deleteAccount as deleteAccountApi } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useThemeContext, resolveTheme, type ThemeMode } from "../context/ThemeContext";
import { useAnimatedThemeTransition } from "../hooks/useAnimatedThemeTransition";
import { AVATAR_KEYS, getAvatarUrl } from "../constants/avatars";
import type { UserProfileDto } from "../types";

const USERNAME_COOLDOWN_DAYS = 10;
const BIO_MAX_LENGTH = 200;

function themeToBackend(mode: ThemeMode): string {
  if (mode === "system") return "System";
  return mode === "light" ? "Light" : "Dark";
}

function backendToTheme(value: string): ThemeMode {
  const v = value?.toLowerCase();
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function SettingsPage() {
  const { user: authUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { setThemeMode } = useThemeContext();
  const { originRef: saveThemeButtonRef, runTransition: runThemeTransition } = useAnimatedThemeTransition<HTMLButtonElement>();
  const profileSectionRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Form state — profile
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profilePictureKey, setProfilePictureKey] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Form state — preferences
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaveError, setPrefsSaveError] = useState<string | null>(null);

  // Account actions — change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  // Account actions — delete account
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setProfileError(null);
    setPrefsError(null);
    try {
      const [profileRes, prefsRes] = await Promise.all([
        getProfile().catch(() => {
          setProfileError("Failed to load profile.");
          return null;
        }),
        getPreferences().catch(() => {
          setPrefsError("Failed to load preferences.");
          return null;
        }),
      ]);
      if (profileRes) {
        setProfile(profileRes);
        setUsername(profileRes.username);
        setEmail(profileRes.email);
        setProfilePictureKey(profileRes.profilePictureKey ?? null);
        setBio(profileRes.bio ?? "");
      }
      if (prefsRes) {
        setTheme(backendToTheme(prefsRes.theme));
        setThemeMode(backendToTheme(prefsRes.theme));
      }
    } finally {
      setLoading(false);
    }
  }, [setThemeMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll to #profile when hash is profile
  useEffect(() => {
    const hash = window.location.hash?.replace("#", "") || window.location.search;
    const isProfile = hash === "profile" || new URLSearchParams(window.location.search).get("section") === "profile";
    if (isProfile && profileSectionRef.current) {
      profileSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const usernameChangedAt = profile?.usernameChangedAt ? new Date(profile.usernameChangedAt) : null;
  const daysSinceUsernameChange = usernameChangedAt
    ? Math.floor((Date.now() - usernameChangedAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const usernameLocked = daysSinceUsernameChange !== null && daysSinceUsernameChange < USERNAME_COOLDOWN_DAYS;
  const daysUntilNextUsernameChange =
    usernameLocked && daysSinceUsernameChange !== null
      ? USERNAME_COOLDOWN_DAYS - daysSinceUsernameChange
      : 0;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaveError(null);
    setSavingProfile(true);
    try {
      await updateProfile({
        username,
        email,
        profilePictureKey: profilePictureKey ?? undefined,
        bio: bio || undefined,
      });
      updateUser({ username, email, profilePictureKey: profilePictureKey ?? undefined });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username,
              email,
              profilePictureKey,
              bio: bio || null,
              usernameChangedAt: prev.usernameChangedAt,
            }
          : null
      );
      await loadData();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data === "object" && err.response?.data !== null && "message" in err.response.data && typeof (err.response.data as { message?: string }).message === "string"
          ? (err.response.data as { message: string }).message
          : "Failed to save profile.";
      setProfileSaveError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefsSaveError(null);
    setSavingPrefs(true);
    try {
      await updatePreferences({
        theme: themeToBackend(theme),
      });
      runThemeTransition(() => {
        document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
        setThemeMode(theme);
      });
      await loadData();
    } catch {
      setPrefsSaveError("Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordChangeError("New password and confirmation do not match.");
      return;
    }
    setPasswordChanging(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      setPasswordChangeSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data === "object" && err.response?.data !== null && "message" in err.response.data && typeof (err.response.data as { message?: string }).message === "string"
          ? (err.response.data as { message: string }).message
          : "Failed to change password.";
      setPasswordChangeError(message);
    } finally {
      setPasswordChanging(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  function openDeleteModal() {
    setDeleteModalOpen(true);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccountApi(deletePassword ? { password: deletePassword } : undefined);
      logout();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data === "object" && err.response?.data !== null && "message" in err.response.data && typeof (err.response.data as { message?: string }).message === "string"
          ? (err.response.data as { message: string }).message
          : "Failed to delete account.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-10 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Manage your account details and preferences.
          </p>
        </div>

        {/* ── Account / Profile ───────────────────────────── */}
        <section ref={profileSectionRef} className="scroll-mt-8 pb-12">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Account &amp; profile
          </h2>
          {profileError && (
            <p className="mb-4 text-sm text-red-500">{profileError}</p>
          )}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile picture */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Profile picture</label>
              <div className="flex flex-wrap gap-3">
                {AVATAR_KEYS.map((key) => {
                  const url = getAvatarUrl(key);
                  const selected = profilePictureKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProfilePictureKey(key)}
                      className={`flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-4 transition-colors ${
                        selected
                          ? "border-blue-500 ring-4 ring-blue-500/30"
                          : "border-border hover:border-blue-400/50"
                      }`}
                    >
                      {url ? (
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          {key.slice(-1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="settings-bio" className="mb-1 block text-sm font-medium text-foreground">
                Bio
              </label>
              <textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="A short bio (optional)"
              />
              <p className="mt-1 text-xs text-foreground/40">{bio.length}/{BIO_MAX_LENGTH}</p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="settings-username" className="mb-1 block text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={usernameLocked}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {usernameLocked && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  You can change your username again in {daysUntilNextUsernameChange} days.
                </p>
              )}
            </div>

            {/* Email — read-only; contact support to change */}
            <div className="group relative">
              <label htmlFor="settings-email" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                Email
                <Lock className="h-3.5 w-3.5 text-foreground/40" aria-hidden />
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground/80 focus:outline-none"
                tabIndex={-1}
                aria-describedby="settings-email-hint"
              />
              <div
                id="settings-email-hint"
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden max-w-[240px] rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-md group-hover:block"
              >
                Contact support to change your email.
              </div>
              {authUser?.isEmailVerified === false && (
                <p className="mt-1 text-xs text-foreground/50">Verify your email to unlock all features.</p>
              )}
            </div>

            {profileSaveError && (
              <p className="text-sm text-red-500">{profileSaveError}</p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </button>
          </form>
        </section>

        {/* ── Preferences ─────────────────────────────────── */}
        <section className="border-t border-border py-12">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Preferences
          </h2>
          {prefsError && (
            <p className="mb-4 text-sm text-red-500">{prefsError}</p>
          )}
          <form onSubmit={handleSavePreferences} className="space-y-6">
            {/* Theme */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Theme</label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleThemeChange(mode)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      theme === mode
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground/70 hover:border-foreground/30"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {prefsSaveError && (
              <p className="text-sm text-red-500">{prefsSaveError}</p>
            )}
            <button
              ref={saveThemeButtonRef}
              type="submit"
              disabled={savingPrefs}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save preferences
            </button>
          </form>
        </section>

        {/* ── Account actions ───────────────────────────── */}
        <section className="border-t border-border pt-12">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Account actions
          </h2>
          <div className="space-y-8">
            {/* Change password */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Change password</h3>
              <div>
                <label htmlFor="settings-current-password" className="mb-1 block text-sm text-foreground/70">
                  Current password
                </label>
                <input
                  id="settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="settings-new-password" className="mb-1 block text-sm text-foreground/70">
                  New password
                </label>
                <input
                  id="settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="settings-confirm-password" className="mb-1 block text-sm text-foreground/70">
                  Confirm new password
                </label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoComplete="new-password"
                />
              </div>
              {passwordChangeError && <p className="text-sm text-red-500">{passwordChangeError}</p>}
              {passwordChangeSuccess && <p className="text-sm text-green-600 dark:text-green-400">Password updated.</p>}
              <button
                type="submit"
                disabled={passwordChanging}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {passwordChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Change password
              </button>
            </form>

            {/* Log out */}
            <div className="border-t border-border/60 pt-6">
              <h3 className="mb-2 text-sm font-medium text-foreground">Log out</h3>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>

            {/* Delete account */}
            <div className="border-t border-border/60 pt-6">
              <h3 className="mb-2 text-sm font-medium text-foreground">Delete account</h3>
              <p className="mb-3 text-sm text-foreground/60">
                Permanently delete your account and all data. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={openDeleteModal}
                className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete account confirmation modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 id="delete-modal-title" className="mb-2 text-lg font-semibold text-foreground">
              Delete account
            </h2>
            <p className="mb-4 text-sm text-foreground/70">
              Permanently delete your account and all data? This cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="delete-account-password" className="mb-1 block text-sm text-foreground/70">
                Confirm with your password (if you have one)
              </label>
              <input
                id="delete-account-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
            {deleteError && <p className="mb-4 text-sm text-red-500">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
