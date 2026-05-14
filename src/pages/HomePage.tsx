import { useNavigate } from "react-router";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { TOOLS, type Tool } from "@/lib/tools";

function ToolCard({ tool }: { tool: Tool }) {
  const navigate = useNavigate();
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const openOrFocusSingletonTab = useTabStore((s) => s.openOrFocusSingletonTab);

  function open() {
    if (tool.singleton) {
      openOrFocusSingletonTab(tool.path, tool.name);
    } else {
      updateTabTitle(tabId, tool.name);
      navigate(tool.path);
    }
  }

  return (
    <button
      onClick={open}
      className="group relative text-left rounded-lg border border-border bg-surface-1 p-5 transition-all duration-200 hover:scale-[1.02] hover:bg-surface-2 hover:border-border-active active:scale-[0.99] overflow-hidden"
    >
      {/* glow on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(400px_at_50%_0%,var(--color-accent-dim),transparent_70%)]" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl leading-none">{tool.icon}</span>
          {tool.badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full tracking-widest uppercase bg-accent-dim text-accent-hover border border-accent-dim">
              {tool.badge}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold mb-1 tracking-tight text-text font-display">
          {tool.name}
        </h3>
        <p className="text-xs leading-relaxed text-text-muted">
          {tool.description}
        </p>
      </div>
    </button>
  );
}

export function HomePage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-2xl w-full mx-auto px-8 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase px-2 py-1 rounded-full bg-surface-2 text-text-muted">
              runkit
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text font-display">
            Your tools
          </h1>
          <p className="text-sm text-text-muted">
            Select a tool to open it in this tab.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
