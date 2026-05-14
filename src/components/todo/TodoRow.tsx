import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check, AlignLeft } from "lucide-react";
import { getPriorityColor, getPriorityLabel } from "@/hooks/useTodoStore";
import { formatDate, isOverdue } from "@/lib/todoUtils";
import type { Todo } from "@/types/todo";

export function TodoRow({ todo, onToggle, onSelect, isDragOverlay }: {
  todo: Todo;
  onToggle: (id: string) => void;
  onSelect: (todo: Todo) => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isComp = todo.completed;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-2 transition-colors ${isDragOverlay ? "bg-surface-2 shadow-xl border border-border-active" : ""}`}
    >
      {/* drag handle */}
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
      >
        <GripVertical size={13} />
      </button>

      {/* checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
          isComp
            ? "bg-accent/30 border-accent/50 text-accent"
            : "border-border-active hover:border-accent/60"
        }`}
      >
        {isComp && <Check size={10} strokeWidth={3} />}
      </button>

      {/* title */}
      <button
        onClick={() => onSelect(todo)}
        className={`flex-1 text-left text-sm transition-colors ${isComp ? "line-through text-text-dim" : "text-text hover:text-accent"}`}
      >
        {todo.title}
      </button>

      {/* chips */}
      <div className="flex items-center gap-1 shrink-0">
        {todo.priority && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
            {getPriorityLabel(todo.priority)}
          </span>
        )}
        {todo.dueDate && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isOverdue(todo.dueDate) && !isComp ? "text-danger border-danger/40 bg-danger/10" : "text-text-muted border-border bg-surface-2"}`}>
            {formatDate(todo.dueDate)}
          </span>
        )}
        {todo.notes && <AlignLeft size={11} className="text-text-dim" />}
      </div>
    </div>
  );
}
