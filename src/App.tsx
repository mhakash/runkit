import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { TabBar } from "@/components/tab-bar/TabBar";
import { TabPanel } from "@/components/layout/TabPanel";
import { useTabStore } from "@/hooks/useTabStore";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import { loadSession } from "@/lib/session";
import { loadSettings } from "@/lib/settings";

function App() {
  const { tabs, activeTabId, hydrated, hydrate, openOrFocusSingletonTab, addTabAtPath, addTab, closeTab } = useTabStore();
  const { hydrated: settingsHydrated, hydrate: hydrateSettings, setTheme } = useSettingsStore();

  useEffect(() => {
    Promise.all([
      loadSession(),
      loadSettings(),
    ]).then(([session, settings]) => {
      hydrateSettings(settings.theme);
      if (session && session.tabs.length > 0) {
        hydrate(session.tabs, session.activeTabId, session.pdfStates ?? {}, session.recentPdfs ?? []);
      } else {
        hydrate(tabs, activeTabId, {}, []);
      }
    });
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlisteners = [
      listen("menu:open-settings", () => openOrFocusSingletonTab("/tool/settings", "Settings")),
      listen("menu:open-todo", () => openOrFocusSingletonTab("/tool/todo", "Todo")),
      listen("menu:open-pdf", () => addTabAtPath("/tool/pdf-reader", "PDF Reader")),
      listen("menu:new-tab", () => addTab()),
      listen("menu:close-tab", () => { if (tabs.length > 1) closeTab(activeTabId); }),
      listen("menu:theme-dark",  () => setTheme("dark")),
      listen("menu:theme-dim",   () => setTheme("dim")),
      listen("menu:theme-light", () => setTheme("light")),
    ];
    return () => { unlisteners.forEach((p) => p.then((fn) => fn())); };
  }, [openOrFocusSingletonTab, addTabAtPath, addTab, closeTab, tabs.length, activeTabId, setTheme]);

  if (!hydrated || !settingsHydrated) {
    return <div className="flex h-full w-full items-center justify-center bg-surface" />;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <TabBar />
      <div className="relative flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            tabId={tab.id}
            isActive={tab.id === activeTabId}
            initialPath={tab.path}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
