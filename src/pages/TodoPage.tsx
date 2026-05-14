import { useEffect, useState, useRef, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useTodoStore, COMPLETED_SECTION_ID } from "@/hooks/useTodoStore";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { matchesFilters } from "@/lib/todoUtils";
import { TodoRow } from "@/components/todo/TodoRow";
import { SectionHeader } from "@/components/todo/SectionHeader";
import { AddTodo } from "@/components/todo/AddTodo";
import { AddSection } from "@/components/todo/AddSection";
import { TodoDrawer } from "@/components/todo/TodoDrawer";
import { FilterBar } from "@/components/todo/FilterBar";
import { ConfirmDialog } from "@/components/todo/ConfirmDialog";
import type { Todo, Section } from "@/types/todo";

export function TodoPage() {
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const {
    sections, todos, filters, hydrated,
    hydrate, addTodo, toggleTodo, deleteSection, updateSection, addSection,
    reorderTodos, reorderSections,
  } = useTodoStore();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ [COMPLETED_SECTION_ID]: true });
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { updateTabTitle(tabId, "Todo"); }, [tabId, updateTabTitle]);
  useEffect(() => { if (renamingSection) renameRef.current?.focus(); }, [renamingSection]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtersActive = filters.date !== null || filters.createdDate !== null || filters.priority !== null || filters.sectionId !== null || filters.status !== "all" || filters.search !== "";

  const userSections = [...sections].sort((a, b) => a.order - b.order);
  const completedSection: Section = { id: COMPLETED_SECTION_ID, name: "Completed", order: 9999 };
  const completedTodos = todos.filter((t) => t.sectionId === COMPLETED_SECTION_ID);
  const allSections = completedTodos.length > 0 || filters.status === "completed" || filters.status === "all"
    ? [...userSections, completedSection]
    : userSections;

  function getTodosForSection(sectionId: string): Todo[] {
    return todos
      .filter((t) => t.sectionId === sectionId && matchesFilters(t, filters))
      .sort((a, b) => a.order - b.order);
  }

  function toggleCollapse(sectionId: string) {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function handleDeleteSection(id: string) {
    const count = todos.filter((t) => t.sectionId === id).length;
    if (count === 0) { deleteSection(id); return; }
    setConfirm({
      message: `Delete "${sections.find((s) => s.id === id)?.name}" and its ${count} todo${count !== 1 ? "s" : ""}? This cannot be undone.`,
      onConfirm: () => { deleteSection(id); setConfirm(null); },
    });
  }

  function commitRename() {
    if (renamingSection && renameValue.trim()) updateSection(renamingSection, renameValue.trim());
    setRenamingSection(null);
  }

  const activeTodo = activeId && !activeId.startsWith("section-") ? todos.find((t) => t.id === activeId) : null;
  const activeSectionId = activeId?.startsWith("section-") ? activeId.replace("section-", "") : null;
  const activeSectionObj = activeSectionId ? sections.find((s) => s.id === activeSectionId) : null;

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const overId = String(e.over?.id ?? "");
    if (overId.startsWith("section-")) {
      setOverSectionId(overId.replace("section-", ""));
    } else {
      const overTodo = todos.find((t) => t.id === overId);
      if (overTodo) setOverSectionId(overTodo.sectionId);
    }
  }, [todos]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverSectionId(null);
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith("section-") && overIdStr.startsWith("section-")) {
      const fromId = activeIdStr.replace("section-", "");
      const toId = overIdStr.replace("section-", "");
      const sorted = [...userSections].sort((a, b) => a.order - b.order);
      const fromIdx = sorted.findIndex((s) => s.id === fromId);
      const toIdx = sorted.findIndex((s) => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      reorderSections(arrayMove(sorted, fromIdx, toIdx).map((s, i) => ({ ...s, order: i })));
      return;
    }

    if (!activeIdStr.startsWith("section-")) {
      const activeTodoItem = todos.find((t) => t.id === activeIdStr);
      if (!activeTodoItem) return;

      let targetSectionId = activeTodoItem.sectionId;
      let overTodo: Todo | undefined;

      if (overIdStr.startsWith("section-")) {
        targetSectionId = overIdStr.replace("section-", "");
      } else {
        overTodo = todos.find((t) => t.id === overIdStr);
        if (overTodo) targetSectionId = overTodo.sectionId;
      }

      if (targetSectionId === COMPLETED_SECTION_ID) return;

      const sectionTodos = todos.filter((t) => t.sectionId === targetSectionId).sort((a, b) => a.order - b.order);

      if (activeTodoItem.sectionId === targetSectionId) {
        const fromIdx = sectionTodos.findIndex((t) => t.id === activeIdStr);
        const toIdx = overTodo ? sectionTodos.findIndex((t) => t.id === overTodo!.id) : sectionTodos.length - 1;
        if (fromIdx === -1 || toIdx === -1) return;
        const reordered = arrayMove(sectionTodos, fromIdx, toIdx).map((t, i) => ({ ...t, order: i }));
        reorderTodos(todos.map((t) => reordered.find((r) => r.id === t.id) ?? t));
      } else {
        const insertIdx = overTodo ? sectionTodos.findIndex((t) => t.id === overTodo!.id) : sectionTodos.length;
        const newSectionTodos = [
          ...sectionTodos.slice(0, insertIdx),
          { ...activeTodoItem, sectionId: targetSectionId },
          ...sectionTodos.slice(insertIdx),
        ].map((t, i) => ({ ...t, order: i }));
        const oldSectionTodos = todos
          .filter((t) => t.sectionId === activeTodoItem.sectionId && t.id !== activeIdStr)
          .sort((a, b) => a.order - b.order)
          .map((t, i) => ({ ...t, order: i }));
        reorderTodos(todos.map((t) => {
          return newSectionTodos.find((r) => r.id === t.id)
            ?? oldSectionTodos.find((r) => r.id === t.id)
            ?? t;
        }));
      }
    }
  }, [todos, userSections, reorderTodos, reorderSections]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[11px] font-mono text-text-dim animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-text-muted">runkit</span>
          <span className="text-text-dim text-[10px]">/</span>
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-text">todo</span>
        </div>
        <span className="text-[10px] font-mono text-text-dim">
          {todos.filter((t) => !t.completed && matchesFilters(t, { ...filters, status: "active" })).length} active
        </span>
      </div>

      <FilterBar />

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allSections.map((s) => `section-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="px-3 py-2 space-y-1">
              {allSections.map((section) => {
                const sectionTodos = getTodosForSection(section.id);
                const isCollapsed = collapsed[section.id] ?? false;
                const isCompleted = section.id === COMPLETED_SECTION_ID;

                if (isCompleted && filters.status === "active" && !filtersActive && completedTodos.length === 0) return null;

                return (
                  <div key={section.id} className="space-y-0.5">
                    {renamingSection === section.id ? (
                      <div className="flex items-center gap-2 px-2 py-1">
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") commitRename(); }}
                          onBlur={commitRename}
                          className="flex-1 bg-transparent text-[11px] font-mono font-semibold tracking-widest uppercase text-text outline-none border-b border-accent"
                        />
                      </div>
                    ) : (
                      <SectionHeader
                        section={section}
                        count={sectionTodos.length}
                        collapsed={isCollapsed}
                        onToggle={() => toggleCollapse(section.id)}
                        onRename={() => { setRenamingSection(section.id); setRenameValue(section.name); }}
                        onDelete={() => handleDeleteSection(section.id)}
                      />
                    )}

                    {!isCollapsed && (
                      <div className={`pl-4 space-y-0.5 min-h-[4px] rounded transition-colors ${overSectionId === section.id && activeId && !activeId.startsWith("section-") ? "bg-accent/5" : ""}`}>
                        <SortableContext items={sectionTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          {sectionTodos.map((todo) => (
                            <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onSelect={setSelectedTodo} />
                          ))}
                        </SortableContext>
                        {!isCompleted && <AddTodo sectionId={section.id} onAdd={addTodo} />}
                        {isCompleted && sectionTodos.length === 0 && (
                          <p className="text-[10px] font-mono text-text-dim px-2 py-1">No completed todos</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 border-t border-border mt-2">
                <AddSection onAdd={addSection} />
              </div>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTodo && <TodoRow todo={activeTodo} onToggle={() => {}} onSelect={() => {}} isDragOverlay />}
            {activeSectionObj && (
              <SectionHeader
                section={activeSectionObj}
                count={getTodosForSection(activeSectionObj.id).length}
                collapsed={collapsed[activeSectionObj.id] ?? false}
                onToggle={() => {}} onRename={() => {}} onDelete={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TodoDrawer todo={selectedTodo} sections={sections} onClose={() => setSelectedTodo(null)} />
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
