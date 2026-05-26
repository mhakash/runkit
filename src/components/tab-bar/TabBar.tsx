import { useState } from "react";
import { Plus } from "lucide-react";
import { Tab, TabDragOverlay } from "./Tab";
import { useTabStore } from "@/hooks/useTabStore";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, reorderTabs } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (over && active.id !== over.id) {
      reorderTabs(active.id as string, over.id as string);
    }
  }

  const draggingTab = draggingId ? tabs.find((t) => t.id === draggingId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-stretch h-9 border-b border-border shrink-0 overflow-hidden bg-surface">
        <div className="flex flex-1 min-w-0 overflow-x-auto">
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-stretch shrink-0">
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  id={tab.id}
                  title={tab.title}
                  isActive={tab.id === activeTabId}
                  isOnly={tabs.length === 1}
                  isDragging={tab.id === draggingId}
                  onClick={() => setActiveTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                />
              ))}
              <button
                onClick={addTab}
                className="shrink-0 flex items-center justify-center w-9 h-full transition-colors hover:bg-surface-2 text-text-muted hover:text-text"
                title="New tab"
              >
                <Plus size={14} />
              </button>
            </div>
          </SortableContext>
        </div>
      </div>
      <DragOverlay>
        {draggingTab ? (
          <TabDragOverlay title={draggingTab.title} isActive={draggingTab.id === activeTabId} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
