import { useCallback, useRef } from "react";

export interface UseFileImportOptions {
  accept?: string;
  onFile: (file: File) => void | Promise<void>;
}

export interface UseFileImportResult {
  inputRef: React.RefObject<HTMLInputElement>;
  accept?: string;
  triggerImport: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Owns the hidden-file-input dance: a ref, a click trigger, and resetting
 * `e.target.value` so re-selecting the same file fires onChange again.
 * Business logic (parsing, uploading, etc.) stays with the caller via `onFile`.
 */
export function useFileImport({ accept, onFile }: UseFileImportOptions): UseFileImportResult {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerImport = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      onFile(file);
    },
    [onFile],
  );

  return { inputRef, accept, triggerImport, handleFileSelect };
}
