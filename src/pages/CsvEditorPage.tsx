import { useState, useRef, useEffect, useMemo, useCallback, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import {
  FolderOpen, Save, Plus, Search, ChevronUp, ChevronDown,
  FileText, AlertCircle, Table2, PencilLine, Trash2,
  ArrowLeft, ArrowRight,
} from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useCsvEditor } from "@/hooks/useCsvEditor";
import { useTabContext } from "@/components/layout/TabContext";
import { useTabStore } from "@/hooks/useTabStore";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 28;
const ROW_NUM_WIDTH = 48;
const DEFAULT_COL_WIDTH = 160;

type RowData = { cells: string[]; originalIndex: number };

// activeCell tracks the selected cell by filtered-row index + col.
// isEditing = the inline input / formula bar is accepting keystrokes.
type ActiveCell = { filteredRow: number; col: number };

export function CsvEditorPage() {
  const { tabId, isActive } = useTabContext();
  const openOrFocusCsvFile = useTabStore((s) => s.openOrFocusCsvFile);
  const tabs = useTabStore((s) => s.tabs);
  const csvStates = useTabStore((s) => s.csvStates);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const { state, actions, filteredRows, filteredToOriginal } = useCsvEditor({ tabId });
  const {
    headers, fileName, filePath: loadedFilePath, isDirty, loading,
    error, filterText, sortConfig, selectedRows, rows,
  } = state;
  const {
    saveFile, updateCell, addRow, deleteRows, addColumn,
    deleteColumn, renameColumn, setSort, setFilter, setSelectedRows, clearError,
  } = actions;

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const formulaBarRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ col: number; x: number; y: number } | null>(null);
  const [renamingCol, setRenamingCol] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastSelectedRow, setLastSelectedRow] = useState<number | null>(null);
  const [addColAfter, setAddColAfter] = useState<number | null>(null);
  const [newColName, setNewColName] = useState("");
  const [colWidths, setColWidths] = useState<number[]>([]);

  const parentRef = useRef<HTMLDivElement>(null);

  // Stable refs so keyboard handler doesn't re-register on every state change
  const kbRef = useRef({ isDirty, loadedFilePath, selectedRows, activeCell, isEditing, editValue, filteredRows, filteredToOriginal });
  useEffect(() => { kbRef.current = { isDirty, loadedFilePath, selectedRows, activeCell, isEditing, editValue, filteredRows, filteredToOriginal }; });

  useEffect(() => {
    setColWidths(headers.map((_, i) => colWidths[i] ?? DEFAULT_COL_WIDTH));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.length]);

  const tableData = useMemo<RowData[]>(
    () => filteredRows.map((row, i) => ({ cells: row, originalIndex: filteredToOriginal[i] })),
    [filteredRows, filteredToOriginal]
  );

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!headers.length) return [];
    return [
      { id: "__rn__", size: ROW_NUM_WIDTH },
      ...headers.map((_, i) => ({
        id: `c${i}`,
        size: colWidths[i] ?? DEFAULT_COL_WIDTH,
        accessorFn: (r: RowData) => r.cells[i] ?? "",
      })),
    ];
  }, [headers, colWidths]);

  const table = useReactTable({ data: tableData, columns, getCoreRowModel: getCoreRowModel() });
  const trows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: trows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 30,
  });

  // Focus inline input when edit mode starts from keyboard/programmatic path
  useEffect(() => {
    if (isEditing && activeCell) editInputRef.current?.focus();
  }, [isEditing, activeCell]);

  useEffect(() => {
    if (!ctxMenu) return;
    const h = () => setCtxMenu(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!ctxMenu]);

  useEffect(() => {
    if (!isActive) return;
    const up = listen<{ paths: string[] }>("tauri://drag-drop", (e) => {
      const path = e.payload.paths?.[0];
      if (!path || !/\.(csv|tsv|txt)$/i.test(path)) return;
      setIsDragOver(false);
      if (!loadedFilePath) actions.loadFile(path);
      else openOrFocusCsvFile(path);
    });
    return () => { up.then((fn) => fn()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, loadedFilePath]);

  function commitEdit(ac?: ActiveCell) {
    const cell = ac ?? kbRef.current.activeCell;
    if (!cell) return;
    const origRow = kbRef.current.filteredToOriginal[cell.filteredRow];
    const val = kbRef.current.editValue;
    setIsEditing(false);
    if (val !== kbRef.current.filteredRows[cell.filteredRow]?.[cell.col]) {
      updateCell(origRow, cell.col, val);
    }
  }

  function navigateTo(filteredRow: number, col: number, enterEdit = false) {
    const maxRow = kbRef.current.filteredRows.length - 1;
    const maxCol = headers.length - 1;
    const r = Math.max(0, Math.min(maxRow, filteredRow));
    const c = Math.max(0, Math.min(maxCol, col));
    const newActive = { filteredRow: r, col: c };
    setActiveCell(newActive);
    setEditValue(kbRef.current.filteredRows[r]?.[c] ?? "");
    setIsEditing(enterEdit);
    virtualizer.scrollToIndex(r, { behavior: "auto" });
  }

  const onKey = useCallback((e: globalThis.KeyboardEvent) => {
    const { isDirty, loadedFilePath, selectedRows, activeCell, isEditing, filteredRows } = kbRef.current;
    const tag = (e.target as HTMLElement).tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA";

    // Save
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (isDirty && loadedFilePath) saveFile();
      return;
    }

    // Delete selected rows (when no cell is being edited)
    if ((e.key === "Delete" || e.key === "Backspace") && selectedRows.size > 0 && !isEditing && !inInput) {
      e.preventDefault();
      deleteRows([...selectedRows]);
      return;
    }

    if (!activeCell) return;

    const { filteredRow, col } = activeCell;

    if (isEditing) {
      // Commit + move on Enter/Tab; cancel on Escape — arrows stay in input
      if (e.key === "Escape") { e.preventDefault(); setIsEditing(false); setEditValue(filteredRows[filteredRow]?.[col] ?? ""); }
      if (e.key === "Enter") { e.preventDefault(); commitEdit(); navigateTo(filteredRow + 1, col); }
      if (e.key === "Tab") { e.preventDefault(); commitEdit(); navigateTo(filteredRow, col + (e.shiftKey ? -1 : 1)); }
      return;
    }

    // Navigation when not editing
    switch (e.key) {
      case "ArrowDown":  e.preventDefault(); navigateTo(filteredRow + 1, col); break;
      case "ArrowUp":    e.preventDefault(); navigateTo(filteredRow - 1, col); break;
      case "ArrowRight": e.preventDefault(); navigateTo(filteredRow, col + 1); break;
      case "ArrowLeft":  e.preventDefault(); navigateTo(filteredRow, col - 1); break;
      case "Tab":        e.preventDefault(); navigateTo(filteredRow, col + (e.shiftKey ? -1 : 1)); break;
      case "Enter":      e.preventDefault(); navigateTo(filteredRow, col, true); break; // enter edit
      case "Escape":     setActiveCell(null); break;
      default:
        // Printable key while not editing → start edit with that character
        if (!inInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          if (kbRef.current.editValue !== (filteredRows[filteredRow]?.[col] ?? "")) {
            // already changed via formula bar; don't override
          } else {
            setEditValue(e.key);
          }
          setIsEditing(true);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveFile, deleteRows, headers.length]);

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isActive, onKey]);

  async function handleOpenFile() {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "CSV / TSV", extensions: ["csv", "tsv", "txt"] }],
    });
    if (!selected) return;
    const path = selected as string;
    const existing = tabs.find((t) => t.id !== tabId && csvStates[t.id]?.filePath === path);
    if (existing) setActiveTab(existing.id);
    else actions.loadFile(path);
  }

  function handleCellKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter/Tab/Escape handled by global onKey; stop propagation to avoid double-fire
    if (["Enter", "Tab", "Escape"].includes(e.key)) e.stopPropagation();
  }

  function handleRowNumClick(e: React.MouseEvent, origIdx: number, filteredIdx: number) {
    commitEdit();
    setActiveCell(null);
    setIsEditing(false);
    if (e.shiftKey && lastSelectedRow !== null) {
      const lo = filteredToOriginal.indexOf(lastSelectedRow);
      const [mn, mx] = [Math.min(lo, filteredIdx), Math.max(lo, filteredIdx)];
      setSelectedRows(new Set(filteredToOriginal.slice(mn, mx + 1)));
    } else {
      const already = selectedRows.has(origIdx) && selectedRows.size === 1;
      setSelectedRows(already ? new Set() : new Set([origIdx]));
      setLastSelectedRow(already ? null : origIdx);
    }
  }

  function handleColCtx(e: React.MouseEvent, ci: number) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ col: ci, x: e.clientX, y: e.clientY });
  }

  function handleRenameCommit() {
    if (renamingCol !== null) {
      renameColumn(renamingCol, renameValue.trim() || headers[renamingCol]);
      setRenamingCol(null);
    }
  }

  const hasFile = headers.length > 0 || !!loadedFilePath;
  const totalW = ROW_NUM_WIDTH + headers.reduce((s, _, i) => s + (colWidths[i] ?? DEFAULT_COL_WIDTH), 0);

  if (!hasFile && !loading) {
    return (
      <div
        className="flex flex-col h-full bg-surface overflow-hidden"
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setIsDragOver(true); } }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => e.preventDefault()}
      >
        <div className="flex-1 flex items-center justify-center px-6">
          <div className={cn(
            "flex flex-col items-center gap-5 p-10 rounded-2xl border-2 border-dashed transition-all duration-200 max-w-sm w-full",
            isDragOver ? "border-accent bg-accent-dim/60 scale-[1.02]" : "border-border bg-surface-1 hover:border-border-active",
          )}>
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-colors", isDragOver ? "bg-accent/20" : "bg-surface-2")}>
              <Table2 size={28} className={isDragOver ? "text-accent" : "text-text-dim"} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-display text-text">Open a CSV file</p>
              <p className="text-xs text-text-dim font-mono">.csv · .tsv · .txt · up to 100 MB</p>
            </div>
            <button onClick={handleOpenFile} className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-display rounded-lg transition-colors">
              <FolderOpen size={13} />
              Browse Files
            </button>
            <p className="text-[11px] text-text-dim font-mono tracking-wide">— or drag &amp; drop here —</p>
          </div>
        </div>
      </div>
    );
  }

  const activeCellOrigRow = activeCell != null ? filteredToOriginal[activeCell.filteredRow] : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Main toolbar */}
      <div className="flex items-center h-9 px-3 gap-2 border-b border-border bg-surface-1 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px]">
          <FileText size={11} className="text-text-dim shrink-0" />
          <span className="text-xs font-display text-text-muted truncate">{fileName ?? "No file"}</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Unsaved changes" />}
        </div>

        <div className="w-px h-4 bg-border shrink-0" />

        <div className="flex items-center gap-1.5 w-56 bg-surface-2 border border-border rounded px-2 h-6 focus-within:border-border-active transition-colors">
          <Search size={10} className="text-text-dim shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rows…"
            className="flex-1 bg-transparent text-xs font-mono text-text placeholder:text-text-dim outline-none min-w-0"
          />
          {filterText && <button onClick={() => setFilter("")} className="text-text-dim hover:text-text-muted leading-none">×</button>}
        </div>

        <div className="flex-1" />

        <span className="text-[11px] font-mono text-text-dim shrink-0">
          {filteredRows.length !== rows.length
            ? `${filteredRows.length.toLocaleString()}/${rows.length.toLocaleString()}`
            : rows.length.toLocaleString()}{" "}
          rows · {headers.length} cols
        </span>

        <div className="w-px h-4 bg-border shrink-0" />

        <div className="flex items-center gap-0.5">
          <ToolBtn icon={<FolderOpen size={11} />} label="Open" onClick={handleOpenFile} />
          <ToolBtn icon={<Save size={11} />} label="Save" onClick={saveFile} disabled={!isDirty || !loadedFilePath} />
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <ToolBtn icon={<Plus size={11} />} label="Row" onClick={() => addRow()} />
          <ToolBtn icon={<Plus size={11} />} label="Col" onClick={() => { setAddColAfter(headers.length - 1); setNewColName(""); }} />
          {selectedRows.size > 0 && (
            <>
              <div className="w-px h-4 bg-border mx-1 shrink-0" />
              <button onClick={() => deleteRows([...selectedRows])} className="flex items-center gap-1 h-6 px-2 text-[11px] font-display text-danger hover:bg-danger/10 rounded transition-colors">
                <Trash2 size={11} />
                Delete {selectedRows.size}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formula bar */}
      {headers.length > 0 && (
        <div className="flex items-center h-8 px-2 gap-2 border-b border-border bg-surface shrink-0">
          <div className="flex items-center justify-center w-32 shrink-0 h-6 rounded bg-surface-2 border border-border px-2 overflow-hidden">
            <span className="text-[11px] font-display text-accent font-medium tracking-wide whitespace-nowrap truncate">
              {activeCell ? `R${(activeCellOrigRow ?? activeCell.filteredRow) + 1} × C${activeCell.col + 1}` : "—"}
            </span>
          </div>
          <div className="w-px h-4 bg-border shrink-0" />
          <input
            ref={formulaBarRef}
            className="flex-1 h-6 bg-transparent text-xs font-mono text-text outline-none placeholder:text-text-dim px-1"
            placeholder="Click a cell to edit"
            value={activeCell ? editValue : ""}
            readOnly={!activeCell}
            onChange={(e) => setEditValue(e.target.value)}
            onFocus={() => { if (activeCell) setIsEditing(true); }}
            onKeyDown={(e) => {
              if (!activeCell) return;
              if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
              if (e.key === "Escape") { setIsEditing(false); setEditValue(filteredRows[activeCell.filteredRow]?.[activeCell.col] ?? ""); }
            }}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 border-b border-danger/20 text-danger text-xs font-mono shrink-0">
          <AlertCircle size={10} />
          <span className="flex-1 truncate">{error}</span>
          <button onClick={clearError} className="hover:opacity-60 ml-1 text-sm leading-none">×</button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-mono text-text-muted animate-pulse">Loading…</span>
        </div>
      )}

      {!loading && headers.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div
            ref={parentRef}
            className="flex-1 overflow-auto min-h-0"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest("[data-cell]") && !target.closest("[data-rownum]")) {
                commitEdit();
                setActiveCell(null);
                setIsEditing(false);
                setSelectedRows(new Set());
              }
            }}
          >
            {/* Sticky header row — inside scroll container for unified rubber-band bounce */}
            <div className="flex border-b border-border bg-surface-1 sticky top-0 z-10" style={{ width: totalW, height: ROW_HEIGHT }}>
              <div
                className="shrink-0 flex items-center justify-center border-r border-border text-[10px] font-display text-text-dim select-none"
                style={{ width: ROW_NUM_WIDTH }}
              >
                #
              </div>
              {headers.map((h, ci) => (
                <div
                  key={ci}
                  className="relative shrink-0 flex items-center border-r border-border cursor-pointer select-none hover:bg-surface-2 transition-colors"
                  style={{ width: colWidths[ci] ?? DEFAULT_COL_WIDTH, height: ROW_HEIGHT }}
                  onClick={() => { if (renamingCol !== ci) setSort(ci); }}
                  onContextMenu={(e) => handleColCtx(e, ci)}
                >
                  {renamingCol === ci ? (
                    <input
                      autoFocus
                      className="absolute inset-0 px-2 bg-accent-dim text-accent text-xs font-display outline-none border border-accent z-10"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRenameCommit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameCommit();
                        if (e.key === "Escape") setRenamingCol(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 px-2 text-xs font-display text-text-muted truncate">{h}</span>
                      {sortConfig?.colIndex === ci && (
                        <span className="pr-1.5 text-accent shrink-0">
                          {sortConfig.direction === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ height: virtualizer.getTotalSize(), width: totalW, position: "relative" }}>
              {virtualizer.getVirtualItems().map((vr) => {
                const row = trows[vr.index];
                const rd = row.original;
                const origIdx = rd.originalIndex;
                const isSel = selectedRows.has(origIdx);
                const isEven = vr.index % 2 === 0;
                const isActiveRow = activeCell?.filteredRow === vr.index;

                return (
                  <div
                    key={vr.key}
                    data-index={vr.index}
                    ref={virtualizer.measureElement}
                    style={{ position: "absolute", top: 0, transform: `translateY(${vr.start}px)`, width: totalW, height: ROW_HEIGHT }}
                    className={cn(
                      "flex border-b",
                      isSel
                        ? "bg-accent-dim border-accent/20"
                        : isEven ? "bg-surface border-border hover:bg-surface-2"
                        : "bg-surface-1 border-border hover:bg-surface-2",
                    )}
                  >
                    <div
                      data-rownum
                      className={cn(
                        "shrink-0 flex items-center justify-center border-r text-[10px] font-display cursor-pointer select-none transition-colors",
                        isSel ? "border-accent/30 text-accent bg-accent/10"
                          : isActiveRow ? "border-border text-accent"
                          : "border-border text-text-dim hover:text-text-muted hover:bg-surface-3",
                      )}
                      style={{ width: ROW_NUM_WIDTH }}
                      onClick={(e) => { e.stopPropagation(); handleRowNumClick(e, origIdx, vr.index); }}
                    >
                      {vr.index + 1}
                    </div>

                    {rd.cells.map((cell, ci) => {
                      const isActive = isActiveRow && activeCell?.col === ci;
                      const isEditingThis = isActive && isEditing;
                      return (
                        <div
                          key={ci}
                          data-cell
                          className={cn(
                            "shrink-0 relative border-r overflow-hidden",
                            isActive ? "border-accent ring-1 ring-accent ring-inset z-1"
                              : isSel ? "border-accent/20"
                              : "border-border",
                          )}
                          style={{ width: colWidths[ci] ?? DEFAULT_COL_WIDTH, height: ROW_HEIGHT }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeCell && (activeCell.filteredRow !== vr.index || activeCell.col !== ci)) commitEdit();
                            setActiveCell({ filteredRow: vr.index, col: ci });
                            setEditValue(cell);
                            setIsEditing(false);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setActiveCell({ filteredRow: vr.index, col: ci });
                            setEditValue(cell);
                            setIsEditing(true);
                          }}
                        >
                          {isEditingThis ? (
                            <input
                              ref={editInputRef}
                              className="absolute inset-0 px-2 bg-accent-dim text-accent text-xs font-mono outline-none z-10"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleCellKeyDown}
                            />
                          ) : (
                            <span className={cn(
                              "absolute inset-0 flex items-center px-2 text-xs font-mono truncate",
                              isActive ? "bg-accent-dim text-accent"
                                : isSel ? "text-accent"
                                : "text-text",
                            )}>
                              {cell}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {ctxMenu && (
        <div
          className="fixed z-50 bg-surface-1 border border-border rounded-xl shadow-2xl py-1.5 min-w-[164px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CtxItem icon={<PencilLine size={11} />} label="Rename" onClick={() => { setRenamingCol(ctxMenu.col); setRenameValue(headers[ctxMenu.col]); setCtxMenu(null); }} />
          <CtxItem icon={<ArrowLeft size={11} />} label="Insert Left" onClick={() => { setAddColAfter(ctxMenu.col - 1); setNewColName(""); setCtxMenu(null); }} />
          <CtxItem icon={<ArrowRight size={11} />} label="Insert Right" onClick={() => { setAddColAfter(ctxMenu.col); setNewColName(""); setCtxMenu(null); }} />
          <div className="my-1 border-t border-border" />
          <CtxItem icon={<Trash2 size={11} />} label="Delete Column" danger onClick={() => { deleteColumn(ctxMenu.col); setCtxMenu(null); }} />
        </div>
      )}

      {addColAfter !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAddColAfter(null)}>
          <div className="bg-surface-1 border border-border rounded-2xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-display text-text-dim uppercase tracking-widest mb-3">New Column Name</p>
            <input
              autoFocus
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono text-text outline-none focus:border-accent transition-colors"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newColName.trim()) { addColumn(newColName.trim(), addColAfter); setAddColAfter(null); }
                if (e.key === "Escape") setAddColAfter(null);
              }}
              placeholder="column_name"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setAddColAfter(null)} className="px-3 py-1.5 text-xs font-display text-text-muted hover:text-text transition-colors rounded-lg">Cancel</button>
              <button
                onClick={() => { if (newColName.trim()) { addColumn(newColName.trim(), addColAfter); setAddColAfter(null); } }}
                disabled={!newColName.trim()}
                className="px-3 py-1.5 text-xs font-display bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-1 h-6 px-2 text-[11px] font-display text-text-muted hover:text-text hover:bg-surface-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      {icon}{label}
    </button>
  );
}

function CtxItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-display transition-colors", danger ? "text-danger hover:bg-danger/10" : "text-text-muted hover:text-text hover:bg-surface-2")}>
      {icon}{label}
    </button>
  );
}
