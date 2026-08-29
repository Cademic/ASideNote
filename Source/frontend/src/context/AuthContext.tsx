/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { postLogin, postLogout, postRegister, postGoogleLogin, postResendVerification, postVerifyEmail } from "../api/auth";
import { getProfile } from "../api/users";
import {
  AUTH_TOKEN_REFRESHED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  type AuthTokenRefreshedDetail,
} from "../api/client";
import type { AuthUser } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  setEmailVerified: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "asidenote.access_token";
const REFRESH_KEY = "asidenote.refresh_token";
const USER_KEY = "asidenote.user";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  // Resync with tokens the axios interceptor rotates/clears silently (e.g. on 401 refresh),
  // so consumers reading accessToken from context (SignalR hooks) don't hold a stale/expired value.
  useEffect(() => {
    const handleTokenRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<AuthTokenRefreshedDetail>).detail;
      if (detail?.token) setAccessToken(detail.token);
    };
    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
    };

    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  // Refetch profile when authenticated so role is set (e.g. on page reload)
  useEffect(() => {
    if (!accessToken || !user) return;
    if (user.role !== undefined && user.role !== "") return;

    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, role: profile.role, profilePictureKey: profile.profilePictureKey ?? prev.profilePictureKey };
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
          return updated;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, user, user?.userId]);

  function persistAuth(token: string, refreshToken: string, authUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setAccessToken(token);
    setUser(authUser);
  }

  const login = useCallback(async (email: string, password: string) => {
    const response = await postLogin({ email, password });
    const authUser: AuthUser = {
      userId: response.userId,
      username: response.username,
      email: response.email,
      isEmailVerified: response.isEmailVerified,
      profilePictureKey: response.profilePictureKey ?? undefined,
    };
    persistAuth(response.token, response.refreshToken, authUser);
    try {
      const profile = await getProfile();
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, profilePictureKey: profile.profilePictureKey ?? undefined, role: profile.role };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Profile fetch optional; avatar will show after settings save
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const response = await postRegister({ username, email, password });
    const authUser: AuthUser = {
      userId: response.userId,
      username: response.username,
      email: response.email,
      isEmailVerified: response.isEmailVerified,
      profilePictureKey: response.profilePictureKey ?? undefined,
    };
    persistAuth(response.token, response.refreshToken, authUser);
    try {
      const profile = await getProfile();
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, profilePictureKey: profile.profilePictureKey ?? undefined, role: profile.role };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Profile fetch optional; avatar will show after settings save
    }
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    const response = await postGoogleLogin({ idToken });
    const authUser: AuthUser = {
      userId: response.userId,
      username: response.username,
      email: response.email,
      isEmailVerified: response.isEmailVerified,
      profilePictureKey: response.profilePictureKey ?? undefined,
    };
    persistAuth(response.token, response.refreshToken, authUser);
    try {
      const profile = await getProfile();
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, profilePictureKey: profile.profilePictureKey ?? undefined, role: profile.role };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Profile fetch optional; avatar will show after settings save
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await postLogout();
    } catch {
      // Proceed with local logout even if API call fails
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);

    setAccessToken(null);
    setUser(null);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    await postVerifyEmail(token);
    // Update local user state
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isEmailVerified: true };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resendVerification = useCallback(async () => {
    if (user?.email) {
      await postResendVerification(user.email);
    }
  }, [user?.email]);

  const setEmailVerified = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isEmailVerified: true };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      isEmailVerified: user?.isEmailVerified ?? false,
      isLoading,
      user,
      accessToken,
      login,
      register,
      googleLogin,
      logout,
      verifyEmail,
      resendVerification,
      setEmailVerified,
      updateUser,
    }),
    [accessToken, isLoading, user, login, register, googleLogin, logout, verifyEmail, resendVerification, setEmailVerified, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
