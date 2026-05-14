import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react";
import type { Section } from "@/types/todo";

export function SectionHeader({ section, count, collapsed, onToggle, onRename, onDelete, isDragOverlay }: {
  section: Section;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `section-${section.id}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-2 transition-colors ${isDragOverlay ? "bg-surface-2 shadow-xl border border-border-active" : ""}`}
    >
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={13} />
      </button>
      <button onClick={onToggle} className="text-text-dim hover:text-text-muted transition-colors shrink-0">
        {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
      </button>
      <span className="text-xs font-mono font-semibold tracking-widest uppercase text-text-muted flex-1">{section.name}</span>
      <span className="text-[11px] font-mono text-text-dim">{count}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onRename} className="text-text-dim hover:text-text-muted transition-colors"><Pencil size={11} /></button>
        <button onClick={onDelete} className="text-text-dim hover:text-danger transition-colors"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}
