import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { X, Calendar, Flag, AlignLeft, Trash2 } from "lucide-react";
import { useTodoStore, COMPLETED_SECTION_ID, getPriorityColor, getPriorityLabel } from "@/hooks/useTodoStore";
import type { Todo, Section, Priority } from "@/types/todo";

export function TodoDrawer({ todo, sections, onClose }: { todo: Todo | null; sections: Section[]; onClose: () => void }) {
  const { updateTodo, deleteTodo } = useTodoStore();
  const [title, setTitle] = useState(todo?.title ?? "");
  const [notes, setNotes] = useState(todo?.notes ?? "");
  const [priority, setPriority] = useState<Priority | "">(todo?.priority ?? "");
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? "");
  const [sectionId, setSectionId] = useState(todo?.sectionId ?? "");

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setNotes(todo.notes ?? "");
      setPriority(todo.priority ?? "");
      setDueDate(todo.dueDate ?? "");
      setSectionId(todo.sectionId);
    }
  }, [todo?.id]);

  function save() {
    if (!todo) return;
    updateTodo(todo.id, {
      title: title.trim() || todo.title,
      notes: notes || undefined,
      priority: (priority as Priority) || undefined,
      dueDate: dueDate || undefined,
      sectionId,
    });
  }

  function handleDelete() {
    if (!todo) return;
    deleteTodo(todo.id);
    onClose();
  }

  const editableSections = sections.filter((s) => s.id !== COMPLETED_SECTION_ID);

  return (
    <Drawer.Root open={!!todo} onOpenChange={(open) => { if (!open) { save(); onClose(); } }} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col bg-surface-1 border-l border-border outline-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted">Detail</span>
            <button onClick={() => { save(); onClose(); }} className="text-text-dim hover:text-text transition-colors"><X size={14} /></button>
          </div>

          {todo && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[9px] font-mono tracking-widest uppercase text-text-dim mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-2 text-xs text-text px-3 py-2 rounded border border-border focus:border-accent outline-none transition-colors"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-[9px] font-mono tracking-widest uppercase text-text-dim mb-1">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full bg-surface-2 text-xs text-text px-3 py-2 rounded border border-border focus:border-accent outline-none transition-colors"
                >
                  {editableSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[9px] font-mono tracking-widest uppercase text-text-dim mb-1.5">
                  <Flag size={10} className="inline mr-1" />Priority
                </label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(priority === p ? "" : p)}
                      className={`flex-1 text-[10px] font-mono py-1 rounded border transition-all ${priority === p ? getPriorityColor(p) : "border-border text-text-dim hover:border-border-active"}`}
                    >
                      {getPriorityLabel(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[9px] font-mono tracking-widest uppercase text-text-dim mb-1">
                  <Calendar size={10} className="inline mr-1" />Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-surface-2 text-xs text-text px-3 py-2 rounded border border-border focus:border-accent outline-none transition-colors scheme-dark"
                />
                {dueDate && (
                  <button onClick={() => setDueDate("")} className="text-[10px] text-text-dim hover:text-text-muted mt-1 flex items-center gap-1 transition-colors">
                    <X size={9} /> Clear date
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[9px] font-mono tracking-widest uppercase text-text-dim mb-1">
                  <AlignLeft size={10} className="inline mr-1" />Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Add notes..."
                  className="w-full bg-surface-2 text-xs text-text px-3 py-2 rounded border border-border focus:border-accent outline-none transition-colors resize-none placeholder:text-text-dim"
                />
              </div>

              {/* Metadata */}
              <div className="text-[10px] font-mono text-text-dim pt-2 border-t border-border space-y-1">
                <div>Created {new Date(todo.createdAt).toLocaleDateString()}</div>
                {todo.completedAt && <div>Completed {new Date(todo.completedAt).toLocaleDateString()}</div>}
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-border shrink-0 flex justify-between items-center">
            <button onClick={handleDelete} className="flex items-center gap-1.5 text-[11px] text-danger/60 hover:text-danger transition-colors">
              <Trash2 size={12} /> Delete
            </button>
            <button onClick={() => { save(); onClose(); }} className="px-3 py-1.5 text-xs bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 rounded transition-colors font-mono">
              Save
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
