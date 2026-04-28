import { useNavigate } from "react-router";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { TOOLS, type Tool } from "@/lib/tools";

function ToolCard({ tool }: { tool: Tool }) {
  const navigate = useNavigate();
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);

  function open() {
    updateTabTitle(tabId, tool.name);
    navigate(tool.path);
  }

  return (
    <button
      onClick={open}
      className="group relative text-left rounded-lg border p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] overflow-hidden"
      style={{
        background: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-active)";
        (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
        (e.currentTarget as HTMLElement).style.background = "var(--color-surface-1)";
      }}
    >
      {/* glow on hover */}
      <div
        className="pointer-events-none absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "radial-gradient(400px at 50% 0%, var(--color-accent-dim), transparent 70%)" }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl leading-none">{tool.icon}</span>
          {tool.badge && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full tracking-widest uppercase"
              style={{
                background: "var(--color-accent-dim)",
                color: "var(--color-accent-hover)",
                border: "1px solid var(--color-accent-dim)",
              }}
            >
              {tool.badge}
            </span>
          )}
        </div>
        <h3
          className="text-sm font-semibold mb-1 tracking-tight"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          {tool.name}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
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
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-2 py-1 rounded-full"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            >
              runkit
            </span>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
          >
            Your tools
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Select a tool to open it in this tab.
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
