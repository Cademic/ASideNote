import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { constrainFixedBox, DROPDOWN_VIEWPORT_PADDING } from "../../lib/dropdown-viewport";

export interface ContextMenuItem {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items: rawItems, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  const items = rawItems.flatMap((item, i) => {
    if (item.divider && i > 0) {
      return [{ divider: true as const }, item];
    }
    return [item];
  });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || typeof window === "undefined") return;
    const rect = menu.getBoundingClientRect();
    const { left, top } = constrainFixedBox(rect.left, rect.top, rect.width, rect.height, DROPDOWN_VIEWPORT_PADDING);
    setPosition({ left, top });
    const maxH = window.innerHeight - 2 * DROPDOWN_VIEWPORT_PADDING;
    if (rect.height > maxH) {
      menu.style.maxHeight = `${maxH}px`;
      menu.style.overflowY = "auto";
    } else {
      menu.style.maxHeight = "";
      menu.style.overflowY = "";
    }
  }, [x, y, rawItems.length]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[220px] max-w-[min(95vw,calc(100vw-1rem))] max-h-[min(400px,calc(100vh-2rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
      style={{
        left: position.left,
        top: position.top,
      }}
      role="menu"
    >
      {items.map((item, i) => {
        if ("divider" in item && item.divider) {
          return <div key={`div-${i}`} className="my-1 border-t border-gray-200 dark:border-gray-600" />;
        }
        const { label, onClick, disabled, icon: Icon, shortcut } = item as ContextMenuItem;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                onClick();
                onClose();
              }
            }}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
              disabled
                ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
                : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />}
            <span className="flex-1">{label}</span>
            {shortcut && (
              <span className={`text-xs ${disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
                {shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return createPortal(menuContent, document.body);
}
