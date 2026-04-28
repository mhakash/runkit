import { useState } from "react";
import { useNavigate } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Zap } from "lucide-react";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";

export function HelloWorldPage() {
  const navigate = useNavigate();
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);

  const [name, setName] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGreet() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const msg = await invoke<string>("greet", { name: name.trim() });
      setResponse(msg);
    } finally {
      setLoading(false);
    }
  }

  function goHome() {
    updateTabTitle(tabId, "Home");
    navigate("/");
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-lg w-full mx-auto px-8 py-10">
        <button
          onClick={goHome}
          className="flex items-center gap-1.5 text-xs mb-8 transition-colors text-text-muted hover:text-text"
        >
          <ArrowLeft size={12} />
          Back to tools
        </button>

        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">👋</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text font-display">
              Hello World
            </h1>
            <p className="text-xs mt-0.5 text-text-muted">Rust IPC test tool</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono mb-2 tracking-wide text-text-muted">
              YOUR NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGreet()}
              placeholder="Enter your name…"
              className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors bg-surface-2 border border-border text-text focus:border-accent select-text"
            />
          </div>

          <button
            onClick={handleGreet}
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 w-full justify-center rounded-md py-2 text-sm font-mono tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent-hover"
          >
            <Zap size={13} />
            {loading ? "Calling Rust…" : "Greet from Rust"}
          </button>
        </div>

        {response && (
          <div className="mt-4 rounded-lg border border-border-active bg-surface-1 px-5 py-4 font-mono text-sm leading-relaxed text-success animate-in fade-in slide-in-from-bottom-2 duration-300">
            {response}
          </div>
        )}
      </div>
    </div>
  );
}
