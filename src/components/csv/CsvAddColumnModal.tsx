import { useState } from "react";

interface CsvAddColumnModalProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CsvAddColumnModal({ onConfirm, onCancel }: CsvAddColumnModalProps) {
  const [name, setName] = useState("");

  function handleConfirm() {
    if (name.trim()) onConfirm(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-surface-1 border border-border rounded-2xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-display text-text-dim uppercase tracking-widest mb-3">New Column Name</p>
        <input
          autoFocus
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono text-text outline-none focus:border-accent transition-colors"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="column_name"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-display text-text-muted hover:text-text transition-colors rounded-lg">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-display bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}
