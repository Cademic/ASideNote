import { useEffect, useRef } from "react";
import { postPresence } from "../api/users";

const HEARTBEAT_MS = 50_000;
const INTERACTION_THROTTLE_MS = 60_000;

function presenceUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
  return `${base}/users/me/presence`;
}

/** Best-effort leave when the tab is closing; Authorization must use token still in storage. */
export function sendPresenceLeaveKeepAlive(): void {
  const token = window.localStorage.getItem("asidenote.access_token");
  if (!token) return;
  const url = presenceUrl();
  try {
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leave: true }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Heartbeats and throttled interaction while the SPA is open so server can derive active / idle / inactive.
 */
export function useSessionPresence(enabled: boolean): void {
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const sendInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionRef.current < INTERACTION_THROTTLE_MS) return;
      lastInteractionRef.current = now;
      postPresence({ interaction: true }).catch(() => {});
    };

    postPresence({ interaction: true }).catch(() => {});

    const intervalId = window.setInterval(() => {
      if (!cancelled) postPresence({ heartbeat: true }).catch(() => {});
    }, HEARTBEAT_MS);

    const onPointer = () => sendInteraction();
    const onKey = () => sendInteraction();
    const onScroll = () => sendInteraction();

    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    const onPageHide = () => {
      sendPresenceLeaveKeepAlive();
    };

    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled]);
}
