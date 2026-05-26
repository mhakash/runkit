import { create } from "zustand";
import type { Tab } from "@/types/tab";
import type { PdfTabState, CsvTabState, RecentPdf } from "@/lib/session";
import { saveSession } from "@/lib/session";
import { fileNameFromPath, stripExtension } from "@/lib/utils";

function createTab(title = "Home", path = "/"): Tab {
  return { id: crypto.randomUUID(), title, path };
}

interface TabStore {
  tabs: Tab[];
  tabInsertionOrder: string[];
  activeTabId: string;
  pdfStates: Record<string, PdfTabState>;
  csvStates: Record<string, CsvTabState>;
  recentPdfs: RecentPdf[];
  hydrated: boolean;

  hydrate: (tabs: Tab[], activeTabId: string, pdfStates: Record<string, PdfTabState>, recentPdfs: RecentPdf[], csvStates?: Record<string, CsvTabState>) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabPath: (id: string, path: string) => void;
  setPdfState: (tabId: string, state: PdfTabState) => void;
  clearPdfState: (tabId: string) => void;
  setCsvState: (tabId: string, state: CsvTabState) => void;
  clearCsvState: (tabId: string) => void;
  openOrFocusCsvFile: (filePath: string) => void;
  upsertRecentPdf: (entry: Omit<RecentPdf, "lastOpenedAt">) => void;
  openOrFocusSingletonTab: (path: string, title: string) => void;
  addTabAtPath: (path: string, title: string) => void;
  reorderTabs: (fromId: string, toId: string) => void;
  flushSave: () => void;
}

const initialTab = createTab();

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveNow(get: () => TabStore) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const { tabs, activeTabId, pdfStates, csvStates, recentPdfs } = get();
  saveSession({ tabs, activeTabId, pdfStates, csvStates, recentPdfs });
}

// Only for high-frequency ephemeral updates (PDF scroll position, zoom level)
function scheduleSave(get: () => TabStore) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(get), 1000);
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [initialTab],
  tabInsertionOrder: [initialTab.id],
  activeTabId: initialTab.id,
  pdfStates: {},
  csvStates: {},
  recentPdfs: [],
  hydrated: false,

  hydrate: (tabs, activeTabId, pdfStates, recentPdfs, csvStates) => {
    set({ tabs, tabInsertionOrder: tabs.map((t) => t.id), activeTabId, pdfStates, csvStates: csvStates ?? {}, recentPdfs: recentPdfs ?? [], hydrated: true });
  },

  flushSave: () => saveNow(get),

  addTab: () => {
    const tab = createTab();
    set((s) => ({ tabs: [...s.tabs, tab], tabInsertionOrder: [...s.tabInsertionOrder, tab.id], activeTabId: tab.id }));
    saveNow(get);
  },

  closeTab: (id) => {
    const { tabs, activeTabId, pdfStates, csvStates } = get();
    if (tabs.length === 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    const newActiveId =
      activeTabId === id
        ? (newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? newTabs[0].id)
        : activeTabId;
    const newPdfStates = { ...pdfStates };
    delete newPdfStates[id];
    const newCsvStates = { ...csvStates };
    delete newCsvStates[id];
    set((s) => ({ tabs: newTabs, tabInsertionOrder: s.tabInsertionOrder.filter((i) => i !== id), activeTabId: newActiveId, pdfStates: newPdfStates, csvStates: newCsvStates }));
    saveNow(get);
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
    saveNow(get);
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
    saveNow(get);
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

  setCsvState: (tabId, state) => {
    set((s) => ({ csvStates: { ...s.csvStates, [tabId]: state } }));
    saveNow(get);
  },

  clearCsvState: (tabId) => {
    set((s) => {
      const next = { ...s.csvStates };
      delete next[tabId];
      return { csvStates: next };
    });
    saveNow(get);
  },

  openOrFocusCsvFile: (filePath) => {
    const { tabs, csvStates } = get();
    const existing = tabs.find((t) => csvStates[t.id]?.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
    } else {
      const name = stripExtension(fileNameFromPath(filePath));
      const tab = createTab(name, "/tool/csv-editor");
      set((s) => ({
        tabs: [...s.tabs, tab],
        tabInsertionOrder: [...s.tabInsertionOrder, tab.id],
        activeTabId: tab.id,
        csvStates: { ...s.csvStates, [tab.id]: { filePath } },
      }));
    }
    saveNow(get);
  },

  addTabAtPath: (path, title) => {
    const tab = createTab(title, path);
    set((s) => ({ tabs: [...s.tabs, tab], tabInsertionOrder: [...s.tabInsertionOrder, tab.id], activeTabId: tab.id }));
    saveNow(get);
  },

  reorderTabs: (fromId, toId) => {
    const { tabs } = get();
    const from = tabs.findIndex((t) => t.id === fromId);
    const to = tabs.findIndex((t) => t.id === toId);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...tabs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ tabs: next });
    saveNow(get);
  },

  openOrFocusSingletonTab: (path, title) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
    } else {
      const tab = createTab(title, path);
      set((s) => ({ tabs: [...s.tabs, tab], tabInsertionOrder: [...s.tabInsertionOrder, tab.id], activeTabId: tab.id }));
    }
    saveNow(get);
  },
}));
