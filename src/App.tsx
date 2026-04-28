import { useEffect } from "react";
import { TabBar } from "@/components/tab-bar/TabBar";
import { TabPanel } from "@/components/layout/TabPanel";
import { useTabStore } from "@/hooks/useTabStore";
import { loadSession } from "@/lib/session";

function App() {
  const { tabs, activeTabId, hydrated, hydrate } = useTabStore();

  useEffect(() => {
    loadSession().then((session) => {
      if (session && session.tabs.length > 0) {
        hydrate(session.tabs, session.activeTabId, session.pdfStates ?? {}, session.recentPdfs ?? []);
      } else {
        hydrate(tabs, activeTabId, {}, []);
      }
    });
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) {
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
