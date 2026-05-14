import { useState, useRef } from "react";
import { Plus } from "lucide-react";

export function AddSection({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function add(val: string) {
    const trimmed = val.trim();
    if (trimmed) { onAdd(trimmed); setValue(""); }
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-2 transition-colors">
      <Plus size={13} className={`shrink-0 transition-colors ${focused ? "text-accent" : "text-text-dim"}`} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { add(e.target.value); setFocused(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { add(value); }
          if (e.key === "Escape") { setValue(""); inputRef.current?.blur(); }
        }}
        placeholder="New section"
        className="flex-1 bg-transparent text-xs text-text placeholder:text-text-dim outline-none"
      />
    </div>
  );
}
