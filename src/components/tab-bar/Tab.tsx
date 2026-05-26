import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TabProps {
  id: string;
  title: string;
  isActive: boolean;
  isOnly: boolean;
  isDragging?: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function Tab({ id, title, isActive, isOnly, isDragging = false, onClick, onClose }: TabProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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

export function TabDragOverlay({ title, isActive }: { title: string; isActive: boolean }) {
  return (
    <button
      className={cn(
        "relative flex items-center gap-2 h-9 px-4 text-xs font-mono tracking-wide min-w-0 max-w-[160px] shrink-0 border-r border-border shadow-lg opacity-90",
        isActive
          ? "bg-surface-1 text-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent"
          : "bg-surface-2 text-text-muted"
      )}
    >
      <span className="truncate flex-1 text-left">{title}</span>
    </button>
  );
}
