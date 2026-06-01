import { useState, useRef, useEffect, useMemo, useCallback, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useCsvEditor } from "@/hooks/useCsvEditor";
import { useTabContext } from "@/components/layout/TabContext";
import { useTabStore } from "@/hooks/useTabStore";
import { cn } from "@/lib/utils";
import { CsvEmptyState } from "@/components/csv/CsvEmptyState";
import { CsvToolbar } from "@/components/csv/CsvToolbar";
import { CsvFormulaBar } from "@/components/csv/CsvFormulaBar";
import { CsvColumnContextMenu } from "@/components/csv/CsvColumnContextMenu";
import { CsvAddColumnModal } from "@/components/csv/CsvAddColumnModal";

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
    error, filterClause, filterError, sortConfig, selectedRows, rows,
  } = state;
  const {
    saveFile, updateCell, addRow, deleteRows, addColumn,
    deleteColumn, renameColumn, setSort, setFilterClause, applyFilter, clearFilter, setSelectedRows, clearError,
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
    scrollMargin: ROW_HEIGHT, // offset for sticky header inside scroll container
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

    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (isDirty && loadedFilePath) saveFile();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "c" && !inInput) {
      const { activeCell, filteredRows } = kbRef.current;
      if (activeCell) {
        e.preventDefault();
        const val = filteredRows[activeCell.filteredRow]?.[activeCell.col] ?? "";
        navigator.clipboard.writeText(val).catch(() => {});
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "v" && !inInput) {
      const { activeCell } = kbRef.current;
      if (activeCell) {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          setEditValue(text);
          setIsEditing(true);
        }).catch(() => {});
      }
      return;
    }

    if ((e.key === "Delete" || e.key === "Backspace") && selectedRows.size > 0 && !isEditing && !inInput) {
      e.preventDefault();
      deleteRows([...selectedRows]);
      return;
    }

    if (!activeCell || inInput) return;

    const { filteredRow, col } = activeCell;

    if (isEditing) {
      if (e.key === "Escape") { e.preventDefault(); setIsEditing(false); setEditValue(filteredRows[filteredRow]?.[col] ?? ""); }
      if (e.key === "Enter") { e.preventDefault(); commitEdit(); navigateTo(filteredRow + 1, col); }
      if (e.key === "Tab") { e.preventDefault(); commitEdit(); navigateTo(filteredRow, col + (e.shiftKey ? -1 : 1)); }
      return;
    }

    switch (e.key) {
      case "ArrowDown":  e.preventDefault(); navigateTo(filteredRow + 1, col); break;
      case "ArrowUp":    e.preventDefault(); navigateTo(filteredRow - 1, col); break;
      case "ArrowRight": e.preventDefault(); navigateTo(filteredRow, col + 1); break;
      case "ArrowLeft":  e.preventDefault(); navigateTo(filteredRow, col - 1); break;
      case "Tab":        e.preventDefault(); navigateTo(filteredRow, col + (e.shiftKey ? -1 : 1)); break;
      case "Enter":      e.preventDefault(); navigateTo(filteredRow, col, true); break;
      case "Escape":     setActiveCell(null); break;
      default:
        if (!inInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          if (kbRef.current.editValue === (filteredRows[filteredRow]?.[col] ?? "")) {
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

  const savedFilePath = useTabStore((s) => s.csvStates[tabId]?.filePath);
  const hasFile = headers.length > 0 || !!loadedFilePath || !!savedFilePath;
  const totalW = ROW_NUM_WIDTH + headers.reduce((s, _, i) => s + (colWidths[i] ?? DEFAULT_COL_WIDTH), 0);
  const activeCellOrigRow = activeCell != null ? filteredToOriginal[activeCell.filteredRow] : null;

  if (!hasFile && !loading) {
    return (
      <CsvEmptyState
        isDragOver={isDragOver}
        onOpen={handleOpenFile}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setIsDragOver(true); } }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => e.preventDefault()}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      <CsvToolbar
        fileName={fileName}
        isDirty={isDirty}
        filterClause={filterClause}
        filterError={filterError}
        rowCount={rows.length}
        filteredRowCount={filteredRows.length}
        colCount={headers.length}
        selectedRowCount={selectedRows.size}
        canSave={isDirty && !!loadedFilePath}
        onOpen={handleOpenFile}
        onSave={saveFile}
        onAddRow={() => addRow()}
        onAddCol={() => setAddColAfter(headers.length - 1)}
        onDeleteSelected={() => deleteRows([...selectedRows])}
        onFilterChange={setFilterClause}
        onFilterSubmit={applyFilter}
        onFilterClear={clearFilter}
      />

      {headers.length > 0 && (
        <CsvFormulaBar
          cellAddress={activeCell ? `R${(activeCellOrigRow ?? activeCell.filteredRow) + 1} × C${activeCell.col + 1}` : null}
          value={activeCell ? editValue : ""}
          isReadOnly={!activeCell}
          onChange={setEditValue}
          onFocus={() => { if (activeCell) setIsEditing(true); }}
          onCommit={() => { if (activeCell) commitEdit(); }}
          onCancel={() => {
            if (activeCell) {
              setIsEditing(false);
              setEditValue(filteredRows[activeCell.filteredRow]?.[activeCell.col] ?? "");
            }
          }}
          inputRef={formulaBarRef}
        />
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
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ col: ci, x: e.clientX, y: e.clientY }); }}
                >
                  {renamingCol === ci ? (
                    <input
                      autoFocus
                      className="absolute inset-0 px-2 bg-accent-dim text-accent text-xs font-display outline-none border border-accent z-10"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => { if (renamingCol !== null) { renameColumn(renamingCol, renameValue.trim() || headers[renamingCol]); setRenamingCol(null); } }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { renameColumn(renamingCol, renameValue.trim() || headers[renamingCol]); setRenamingCol(null); }
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

            <div style={{ height: virtualizer.getTotalSize() - ROW_HEIGHT, width: totalW, position: "relative" }}>
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
                    style={{ position: "absolute", top: 0, transform: `translateY(${vr.start - virtualizer.options.scrollMargin}px)`, width: totalW, height: ROW_HEIGHT }}
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
        <CsvColumnContextMenu
          col={ctxMenu.col}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onRename={(col) => { setRenamingCol(col); setRenameValue(headers[col]); setCtxMenu(null); }}
          onInsertLeft={(col) => { setAddColAfter(col - 1); setCtxMenu(null); }}
          onInsertRight={(col) => { setAddColAfter(col); setCtxMenu(null); }}
          onDelete={(col) => { deleteColumn(col); setCtxMenu(null); }}
        />
      )}

      {addColAfter !== null && (
        <CsvAddColumnModal
          onConfirm={(name) => { addColumn(name, addColAfter); setAddColAfter(null); }}
          onCancel={() => setAddColAfter(null)}
        />
      )}
    </div>
  );
}
