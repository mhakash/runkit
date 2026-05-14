import { useEffect } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { TabContext } from "./TabContext";
import { useTabStore } from "@/hooks/useTabStore";
import { HomePage } from "@/pages/HomePage";
import { HelloWorldPage } from "@/pages/HelloWorldPage";
import { PdfReaderPage } from "@/pages/PdfReaderPage";
import { TodoPage } from "@/pages/TodoPage";

// Tracks the current route inside a tab's MemoryRouter and persists it.
function RouteTracker({ tabId }: { tabId: string }) {
  const location = useLocation();
  const updateTabPath = useTabStore((s) => s.updateTabPath);

  useEffect(() => {
    updateTabPath(tabId, location.pathname);
  }, [tabId, location.pathname, updateTabPath]);

  return null;
}

interface TabPanelProps {
  tabId: string;
  isActive: boolean;
  initialPath: string;
}

export function TabPanel({ tabId, isActive, initialPath }: TabPanelProps) {
  return (
    <TabContext.Provider value={{ tabId, isActive }}>
      <div
        className="absolute inset-0"
        style={{ display: isActive ? "flex" : "none", flexDirection: "column" }}
      >
        <MemoryRouter initialEntries={[initialPath]}>
          <RouteTracker tabId={tabId} />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tool/hello-world" element={<HelloWorldPage />} />
            <Route path="/tool/pdf-reader" element={<PdfReaderPage />} />
            <Route path="/tool/todo" element={<TodoPage />} />
          </Routes>
        </MemoryRouter>
      </div>
    </TabContext.Provider>
  );
}
