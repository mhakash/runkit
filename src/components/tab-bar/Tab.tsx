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
        "group relative flex items-center gap-2 h-full px-4 text-xs font-mono tracking-wide transition-all duration-150 min-w-0 max-w-[160px] shrink-0 border-r",
        "border-[var(--color-border)]",
        isActive
          ? "bg-[var(--color-surface-1)] text-[var(--color-text)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-accent)]"
          : "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      )}
    >
      <span className="truncate flex-1 text-left">{title}</span>
      {!isOnly && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onClose();
            }
          }}
          className={cn(
            "flex-shrink-0 rounded p-0.5 transition-opacity",
            isActive
              ? "opacity-60 hover:opacity-100 hover:bg-[var(--color-surface-3)]"
              : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[var(--color-surface-3)]"
          )}
        >
          <X size={11} />
        </span>
      )}
    </button>
  );
}
