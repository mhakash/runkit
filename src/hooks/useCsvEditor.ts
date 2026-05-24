import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useTabStore } from "@/hooks/useTabStore";
import { fileNameFromPath, stripExtension } from "@/lib/utils";

interface CsvData {
  headers: string[];
  rows: string[][];
}

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  colIndex: number;
  direction: SortDirection;
}

export interface CsvEditorState {
  headers: string[];
  rows: string[][];
  filePath: string | null;
  fileName: string | null;
  isDirty: boolean;
  loading: boolean;
  error: string | null;
  filterText: string;
  sortConfig: SortConfig | null;
  selectedRows: Set<number>;
}

export interface CsvEditorActions {
  openFile: () => Promise<void>;
  loadFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  updateCell: (rowIndex: number, colIndex: number, value: string) => void;
  addRow: (afterIndex?: number) => void;
  deleteRows: (indices: number[]) => void;
  addColumn: (name: string, afterIndex?: number) => void;
  deleteColumn: (colIndex: number) => void;
  renameColumn: (colIndex: number, name: string) => void;
  setSort: (colIndex: number) => void;
  setFilter: (text: string) => void;
  setSelectedRows: (rows: Set<number>) => void;
  clearError: () => void;
}

export interface UseCsvEditorResult {
  state: CsvEditorState;
  actions: CsvEditorActions;
  filteredRows: string[][];
  filteredToOriginal: number[];
}

interface UseCsvEditorOptions {
  tabId: string;
}

export function useCsvEditor({ tabId }: UseCsvEditorOptions): UseCsvEditorResult {
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const setCsvState = useTabStore((s) => s.setCsvState);
  const savedCsvState = useTabStore((s) => s.csvStates[tabId]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !savedCsvState) return;
    restoredRef.current = true;
    loadFile(savedCsvState.filePath).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFile(path: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<CsvData>("read_csv", { path });
      setHeaders(data.headers);
      setRows(data.rows);
      const name = fileNameFromPath(path);
      setFilePath(path);
      setFileName(name);
      setIsDirty(false);
      setSelectedRows(new Set());
      setSortConfig(null);
      setFilterText("");
      updateTabTitle(tabId, stripExtension(name));
      setCsvState(tabId, { filePath: path });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openFile() {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "CSV / TSV", extensions: ["csv", "tsv", "txt"] }],
      });
      if (!selected) return;
      await loadFile(selected as string);
    } catch (e) {
      setError(String(e));
    }
  }

  async function saveFile() {
    if (!filePath) return;
    try {
      await invoke("write_csv", { payload: { path: filePath, headers, rows } });
      setIsDirty(false);
    } catch (e) {
      setError(String(e));
    }
  }

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => [...r]);
      next[rowIndex][colIndex] = value;
      return next;
    });
    setIsDirty(true);
  }, []);

  const addRow = useCallback((afterIndex?: number) => {
    setRows((prev) => {
      const emptyRow = Array(Math.max(prev[0]?.length ?? 1, 1)).fill("");
      const insertAt = afterIndex != null ? afterIndex + 1 : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, emptyRow);
      return next;
    });
    setIsDirty(true);
  }, []);

  const deleteRows = useCallback((indices: number[]) => {
    const set = new Set(indices);
    setRows((prev) => prev.filter((_, i) => !set.has(i)));
    setSelectedRows(new Set());
    setIsDirty(true);
  }, []);

  const addColumn = useCallback((name: string, afterIndex?: number) => {
    setHeaders((prev) => {
      const insertAt = afterIndex != null ? afterIndex + 1 : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, name);
      return next;
    });
    setRows((prev) =>
      prev.map((row) => {
        const insertAt = afterIndex != null ? afterIndex + 1 : row.length;
        const next = [...row];
        next.splice(insertAt, 0, "");
        return next;
      })
    );
    setIsDirty(true);
  }, []);

  const deleteColumn = useCallback((colIndex: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== colIndex));
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== colIndex)));
    setIsDirty(true);
  }, []);

  const renameColumn = useCallback((colIndex: number, name: string) => {
    setHeaders((prev) => prev.map((h, i) => (i === colIndex ? name : h)));
    setIsDirty(true);
  }, []);

  const setSort = useCallback((colIndex: number) => {
    setSortConfig((prev) => {
      if (!prev || prev.colIndex !== colIndex) return { colIndex, direction: "asc" };
      if (prev.direction === "asc") return { colIndex, direction: "desc" };
      return null;
    });
  }, []);

  const { filteredRows, filteredToOriginal } = useMemo(() => {
    let pairs: [string[], number][] = rows.map((r, i) => [r, i]);

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      pairs = pairs.filter(([row]) => row.some((cell) => cell.toLowerCase().includes(q)));
    }

    if (sortConfig) {
      const { colIndex, direction } = sortConfig;
      pairs = [...pairs].sort(([a], [b]) => {
        const av = a[colIndex] ?? "";
        const bv = b[colIndex] ?? "";
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return {
      filteredRows: pairs.map(([r]) => r),
      filteredToOriginal: pairs.map(([, i]) => i),
    };
  }, [rows, filterText, sortConfig]);

  return {
    state: {
      headers,
      rows,
      filePath,
      fileName,
      isDirty,
      loading,
      error,
      filterText,
      sortConfig,
      selectedRows,
    },
    actions: {
      openFile,
      loadFile,
      saveFile,
      updateCell,
      addRow,
      deleteRows,
      addColumn,
      deleteColumn,
      renameColumn,
      setSort,
      setFilter: setFilterText,
      setSelectedRows,
      clearError: () => setError(null),
    },
    filteredRows,
    filteredToOriginal,
  };
}
