import { useCallback, useEffect, useRef, useState } from "react";

export interface UseResourceListConfig<T extends { id: string; name: string }> {
  fetchList: () => Promise<T[]>;
  loadErrorMessage: string;
  rename?: {
    call: (
      id: string,
      name: string,
      item: T | undefined,
      description?: string,
    ) => Promise<void>;
  };
  pin?: {
    call: (id: string, isPinned: boolean) => Promise<void>;
    applyOptimistic: (item: T, isPinned: boolean) => T;
    onSuccess?: () => void;
  };
  remove: {
    call: (id: string) => Promise<void>;
    onOptimisticRemove?: (id: string) => void;
    onSuccess?: () => void;
  };
}

export interface UseResourceListResult<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  renameItem?: (
    id: string,
    name: string,
    description?: string,
  ) => Promise<void>;
  togglePin?: (id: string, isPinned: boolean) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

/**
 * Owns the fetch/rename/pin/delete state shape shared by the resource lists behind the Gallery
 * (projects, boards, notebooks — one instance per kind in `useGalleryItems`). Config-driven
 * rather than one-size-fits-all: `rename`/`pin` are omitted entirely for callers that don't
 * support them, and `remove`'s optional hooks let each caller preserve its own side-effect
 * ordering (e.g. closing an open board tab synchronously before the delete call resolves, vs.
 * only refreshing pinned lists after success).
 *
 * `refetchDeps` mirrors a manual useEffect dependency list for when the fetch itself needs to
 * re-run in response to something other than mount. Defaults to fetch-once-on-mount. `config`
 * is read from a ref internally so `refetch`'s identity stays stable across renders while still
 * always calling the latest `fetchList` closure - passing an inline config object every render
 * (the common case) is safe and never causes an extra fetch.
 */
export function useResourceList<T extends { id: string; name: string }>(
  config: UseResourceListConfig<T>,
  refetchDeps: React.DependencyList = [],
): UseResourceListResult<T> {
  const configRef = useRef(config);
  configRef.current = config;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const result = await configRef.current.fetchList();
      setItems(result);
    } catch {
      setError(configRef.current.loadErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refetchDeps);

  const { rename, pin, remove } = config;

  const renameItem = rename
    ? async (id: string, name: string, description?: string) => {
        const item = items.find((i) => i.id === id);
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, name, ...(description !== undefined && { description }) }
              : i,
          ),
        );
        try {
          await rename.call(id, name, item, description);
        } catch {
          refetch();
        }
      }
    : undefined;

  const togglePin = pin
    ? async (id: string, isPinned: boolean) => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? pin.applyOptimistic(i, isPinned) : i)),
        );
        try {
          await pin.call(id, isPinned);
          pin.onSuccess?.();
        } catch {
          refetch();
        }
      }
    : undefined;

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    remove.onOptimisticRemove?.(id);
    try {
      await remove.call(id);
      remove.onSuccess?.();
    } catch {
      refetch();
    }
  };

  return { items, isLoading, error, refetch, setItems, renameItem, togglePin, deleteItem };
}
