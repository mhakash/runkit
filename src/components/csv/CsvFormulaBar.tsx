import { type KeyboardEvent } from "react";

interface CsvFormulaBarProps {
  cellAddress: string | null;
  value: string;
  isReadOnly: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onCommit: () => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function CsvFormulaBar({ cellAddress, value, isReadOnly, onChange, onFocus, onCommit, onCancel, inputRef }: CsvFormulaBarProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); onCommit(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  }

  return (
    <div className="flex items-center h-8 px-2 gap-2 border-b border-border bg-surface shrink-0">
      <div className="flex items-center justify-center w-32 shrink-0 h-6 rounded bg-surface-2 border border-border px-2 overflow-hidden">
        <span className="text-[11px] font-display text-accent font-medium tracking-wide whitespace-nowrap truncate">
          {cellAddress ?? "—"}
        </span>
      </div>
      <div className="w-px h-4 bg-border shrink-0" />
      <input
        ref={inputRef}
        className="flex-1 h-6 bg-transparent text-xs font-mono text-text outline-none placeholder:text-text-dim px-1"
        placeholder="Click a cell to edit"
        value={value}
        readOnly={isReadOnly}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
