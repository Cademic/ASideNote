import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getAvatarUrl } from "../../constants/avatars";
import { getColorForUserId } from "../../lib/presenceColors";

export interface AvatarGroupUser {
  userId: string;
  displayName: string;
  profilePictureKey?: string | null;
}

interface AvatarGroupProps {
  users: AvatarGroupUser[];
  /** Max avatars to show before collapsing the rest into a "+N" chip. */
  maxVisible?: number;
  /** When provided, each avatar opens this href in a new tab; otherwise avatars are inert buttons. */
  getProfileHref?: (userId: string) => string;
  /** Avatar diameter in px. */
  size?: number;
  className?: string;
}

const DEFAULT_MAX_VISIBLE = 5;
const DEFAULT_SIZE = 36;
/** Minimum gap kept between the tooltip and the viewport edge, so it never gets cut off. */
const TOOLTIP_VIEWPORT_MARGIN = 8;
/**
 * Vertical gap between the tooltip and the avatar's resting position. Measured generously because
 * the avatar itself lifts and scales up on hover (see the `animate` prop below) — this gap has to
 * clear that lift too, or the tooltip ends up covering the avatar once the hover animation settles.
 */
const TOOLTIP_GAP = 22;

interface AvatarGroupItemProps {
  user: AvatarGroupUser;
  isActive: boolean;
  zIndex: number;
  marginLeft: number;
  size: number;
  href?: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onFocusStart: () => void;
  onFocusEnd: () => void;
}

interface TooltipPosition {
  left: number;
  top: number;
  arrowLeft: number;
}

/** One avatar in the stack. Renders its hover/focus name tooltip through a portal so it can float above the board's clipped, overflow-hidden canvas instead of being cut off at the board's edge. */
function AvatarGroupItem({
  user,
  isActive,
  zIndex,
  marginLeft,
  size,
  href,
  onHoverStart,
  onHoverEnd,
  onFocusStart,
  onFocusEnd,
}: AvatarGroupItemProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

  // Measure the avatar's resting position synchronously, before the hover/focus state change below
  // triggers the lift+scale animation — reading the rect any later would race the animation and
  // capture a mid-transition position, which is what caused the tooltip to drift off-center.
  const measure = () => setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);

  // Once the (hidden) tooltip has mounted and can be measured, clamp it inside the viewport and reveal it.
  useLayoutEffect(() => {
    if (!anchorRect) {
      setTooltipPos(null);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const tooltipWidth = el.offsetWidth;
    const centerX = anchorRect.left + anchorRect.width / 2;
    const maxLeft = window.innerWidth - TOOLTIP_VIEWPORT_MARGIN - tooltipWidth;
    const left = Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(centerX - tooltipWidth / 2, maxLeft));
    setTooltipPos({ left, top: anchorRect.top - TOOLTIP_GAP, arrowLeft: centerX - left });
  }, [anchorRect]);

  const avatarUrl = getAvatarUrl(user.profilePictureKey);
  const color = getColorForUserId(user.userId);
  const initial = (user.displayName.trim()[0] ?? "?").toUpperCase();
  const label = href ? `View ${user.displayName}'s profile` : user.displayName;

  const avatarContent = avatarUrl ? (
    <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    <div
      className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.5, marginLeft }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.12 : 1,
        y: isActive ? -6 : 0,
        marginLeft,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative list-none"
      style={{ zIndex }}
    >
      <div
        ref={anchorRef}
        onMouseEnter={() => {
          measure();
          onHoverStart();
        }}
        onMouseLeave={onHoverEnd}
        style={{ width: size, height: size }}
      >
        {href ? (
          <Link
            to={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="block h-full w-full overflow-hidden rounded-full border-2 border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            onFocus={() => {
              measure();
              onFocusStart();
            }}
            onBlur={onFocusEnd}
          >
            {avatarContent}
          </Link>
        ) : (
          <button
            type="button"
            aria-label={label}
            className="block h-full w-full overflow-hidden rounded-full border-2 border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            onFocus={() => {
              measure();
              onFocusStart();
            }}
            onBlur={onFocusEnd}
          >
            {avatarContent}
          </button>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {isActive && (
            <motion.div
              key="tooltip"
              ref={tooltipRef}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              aria-hidden="true"
              style={{
                position: "fixed",
                left: tooltipPos?.left ?? anchorRect?.left ?? 0,
                top: tooltipPos?.top ?? anchorRect?.top ?? 0,
                transform: "translateY(-100%)",
                visibility: tooltipPos ? "visible" : "hidden",
                zIndex: 9999,
              }}
              className="pointer-events-none whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg"
            >
              {user.displayName}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "100%",
                  left: tooltipPos?.arrowLeft ?? "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid hsl(var(--color-foreground))",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.li>
  );
}

/** Stacked, overlapping avatars with a hover/focus-revealed name tooltip. Adapted from https://animate-ui.com/docs/components/animate/avatar-group for this app's presence colors and preset avatar keys. The tooltip is portaled to the document body so it floats above the board's clipped canvas instead of being cut off at its edges. */
export function AvatarGroup({ users, maxVisible = DEFAULT_MAX_VISIBLE, getProfileHref, size = DEFAULT_SIZE, className = "" }: AvatarGroupProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const overlap = Math.round(size / 3);
  const visibleCount = users.length > maxVisible ? maxVisible - 1 : users.length;
  const visibleUsers = users.slice(0, visibleCount);
  const overflowCount = users.length - visibleUsers.length;

  return (
    <ul className={`flex items-center ${className}`} role="list" aria-label="Connected users">
      {visibleUsers.map((u, index) => {
        const isActive = !prefersReducedMotion && (hoveredId === u.userId || focusedId === u.userId);
        return (
          <AvatarGroupItem
            key={u.userId}
            user={u}
            isActive={isActive}
            zIndex={isActive ? 50 : visibleUsers.length - index}
            marginLeft={index === 0 ? 0 : -overlap}
            size={size}
            href={getProfileHref?.(u.userId)}
            onHoverStart={() => setHoveredId(u.userId)}
            onHoverEnd={() => setHoveredId((id) => (id === u.userId ? null : id))}
            onFocusStart={() => setFocusedId(u.userId)}
            onFocusEnd={() => setFocusedId((id) => (id === u.userId ? null : id))}
          />
        );
      })}

      {overflowCount > 0 && (
        <li
          className="relative flex shrink-0 items-center justify-center rounded-full border-2 border-border bg-foreground/10 text-xs font-semibold text-foreground/70 list-none"
          style={{ width: size, height: size, marginLeft: -overlap }}
          aria-label={`${overflowCount} more connected user${overflowCount === 1 ? "" : "s"}`}
        >
          +{overflowCount}
        </li>
      )}
    </ul>
  );
}
