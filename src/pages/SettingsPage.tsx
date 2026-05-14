import { useEffect } from "react";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import type { Theme } from "@/lib/settings";

const THEMES: { value: Theme; label: string; description: string; preview: string[] }[] = [
  {
    value: "dark",
    label: "Dark",
    description: "Deep charcoal with purple accents",
    preview: ["#0e0e10", "#17171a", "#7c6af7"],
  },
  {
    value: "dim",
    label: "Dim",
    description: "Cool blue-grey, easy on the eyes",
    preview: ["#1e2029", "#252830", "#7c6af7"],
  },
  {
    value: "light",
    label: "Light",
    description: "Warm off-white, clean and bright",
    preview: ["#f5f0eb", "#faf7f4", "#6254d4"],
  },
];

export function SettingsPage() {
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const { theme, setTheme } = useSettingsStore();

  useEffect(() => { updateTabTitle(tabId, "Settings"); }, [tabId, updateTabTitle]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-xl w-full mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase px-2 py-1 rounded-full bg-surface-2 text-text-muted">
              runkit
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text font-display">Settings</h1>
          <p className="text-sm text-text-muted">Customize your Runkit experience.</p>
        </div>

        {/* Appearance section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-text-muted">Appearance</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-xs text-text-muted mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`relative text-left rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] ${
                    isActive
                      ? "border-accent bg-accent-dim"
                      : "border-border bg-surface-1 hover:border-border-active hover:bg-surface-2"
                  }`}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1 mb-3">
                    {t.preview.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className={`text-sm font-semibold mb-0.5 font-display ${isActive ? "text-accent" : "text-text"}`}>
                    {t.label}
                  </p>
                  <p className="text-[11px] text-text-muted leading-snug">{t.description}</p>
                  {isActive && (
                    <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
