import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabProps {
  title: string;
  isActive: boolean;
  isOnly: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function Tab({ title, isActive, isOnly, onClick, onClose }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 h-full px-4 text-xs font-mono tracking-wide transition-all duration-150 min-w-0 max-w-[160px] shrink-0 border-r border-border",
        isActive
          ? "bg-surface-1 text-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent"
          : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text"
      )}
    >
      <span className="truncate flex-1 text-left">{title}</span>
      {!isOnly && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onClose(); }
          }}
          className={cn(
            "shrink-0 rounded p-0.5 transition-opacity hover:bg-surface-3",
            isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100!"
          )}
        >
          <X size={11} />
        </span>
      )}
    </button>
  );
}
