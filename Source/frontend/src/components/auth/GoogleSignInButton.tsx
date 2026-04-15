import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  onError: (message: string) => void;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
              logo_alignment?: string;
            },
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(400);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  const handleCredentialResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      setIsLoading(true);
      try {
        await googleLogin(response.credential);
        navigate("/dashboard", { replace: true });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          onError(axiosErr.response?.data?.message ?? "Google sign-in failed.");
        } else {
          onError("Google sign-in failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [googleLogin, navigate, onError],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load Google Identity Services script
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setIsScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      const nextIsDark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(nextIsDark);
    };

    handleThemeChange();

    const themeObserver = new MutationObserver(handleThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkModeQuery.addEventListener("change", handleThemeChange);

    return () => {
      themeObserver.disconnect();
      darkModeQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const syncButtonWidth = () => {
      if (!containerRef.current) return;
      const nextWidth = Math.min(Math.floor(containerRef.current.clientWidth), 400);
      setButtonWidth(nextWidth > 0 ? nextWidth : 400);
    };

    syncButtonWidth();

    const resizeObserver = new ResizeObserver(syncButtonWidth);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !isScriptLoaded || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    containerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: isDarkMode ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      width: buttonWidth,
      logo_alignment: "center",
    });
  }, [isScriptLoaded, handleCredentialResponse, buttonWidth, isDarkMode]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="flex justify-center">
      {/*
        Keep Google's rendered button mounted while loading. Swapping the whole subtree for a
        loading row caused the iframe/button to composite with the spinner's transform and appear
        to rotate. The overlay isolates the spinner animation to a small element only.
      */}
      <div className="relative w-full max-w-[400px]">
        <div
          ref={containerRef}
          className={`flex justify-center ${isLoading ? "pointer-events-none opacity-50" : ""}`}
        />
        {isLoading && (
          <div
            className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-background/90 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
          >
            <span
              className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground"
              aria-hidden
            />
            <span className="text-sm text-foreground/60">Signing in with Google...</span>
          </div>
        )}
      </div>
    </div>
  );
}
