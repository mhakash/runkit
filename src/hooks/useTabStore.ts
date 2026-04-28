import { create } from "zustand";
import type { Tab } from "@/types/tab";
import type { PdfTabState, RecentPdf } from "@/lib/session";
import { saveSession } from "@/lib/session";

function createTab(title = "Home", path = "/"): Tab {
  return { id: crypto.randomUUID(), title, path };
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string;
  pdfStates: Record<string, PdfTabState>;
  recentPdfs: RecentPdf[];
  hydrated: boolean;

  hydrate: (tabs: Tab[], activeTabId: string, pdfStates: Record<string, PdfTabState>, recentPdfs: RecentPdf[]) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabPath: (id: string, path: string) => void;
  setPdfState: (tabId: string, state: PdfTabState) => void;
  clearPdfState: (tabId: string) => void;
  upsertRecentPdf: (entry: Omit<RecentPdf, "lastOpenedAt">) => void;
}

const initialTab = createTab();

// Debounced save — batches rapid updates (e.g. page scroll) into one write
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(get: () => TabStore) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { tabs, activeTabId, pdfStates, recentPdfs } = get();
    saveSession({ tabs, activeTabId, pdfStates, recentPdfs });
  }, 300);
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  pdfStates: {},
  recentPdfs: [],
  hydrated: false,

  hydrate: (tabs, activeTabId, pdfStates, recentPdfs) => {
    set({ tabs, activeTabId, pdfStates, recentPdfs: recentPdfs ?? [], hydrated: true });
  },

  addTab: () => {
    const tab = createTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    scheduleSave(get);
  },

  closeTab: (id) => {
    const { tabs, activeTabId, pdfStates } = get();
    if (tabs.length === 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    const newActiveId =
      activeTabId === id
        ? (newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? newTabs[0].id)
        : activeTabId;
    const newPdfStates = { ...pdfStates };
    delete newPdfStates[id];
    set({ tabs: newTabs, activeTabId: newActiveId, pdfStates: newPdfStates });
    scheduleSave(get);
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
    scheduleSave(get);
  },

  updateTabTitle: (id, title) => {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) }));
    scheduleSave(get);
  },

  updateTabPath: (id, path) => {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, path } : t)) }));
    scheduleSave(get);
  },

  setPdfState: (tabId, state) => {
    set((s) => ({ pdfStates: { ...s.pdfStates, [tabId]: state } }));
    scheduleSave(get);
  },

  clearPdfState: (tabId) => {
    set((s) => {
      const next = { ...s.pdfStates };
      delete next[tabId];
      return { pdfStates: next };
    });
    scheduleSave(get);
  },

  upsertRecentPdf: (entry) => {
    set((s) => {
      const filtered = s.recentPdfs.filter((r) => r.filePath !== entry.filePath);
      return {
        recentPdfs: [{ ...entry, lastOpenedAt: Date.now() }, ...filtered],
      };
    });
    scheduleSave(get);
  },
}));
