import { Plus } from "lucide-react";
import { Tab } from "./Tab";
import { useTabStore } from "@/hooks/useTabStore";

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useTabStore();

  return (
    <div
      className="flex items-stretch h-9 border-b shrink-0 overflow-x-auto"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-stretch min-w-0 flex-1">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            title={tab.title}
            isActive={tab.id === activeTabId}
            isOnly={tabs.length === 1}
            onClick={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}
      </div>
      <button
        onClick={addTab}
        className="flex-shrink-0 flex items-center justify-center w-9 h-full transition-colors hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border-l border-[var(--color-border)]"
        title="New tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
