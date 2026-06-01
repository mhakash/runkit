import { FolderOpen, Save, Plus, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvToolbarProps {
  fileName: string | null;
  isDirty: boolean;
  filterClause: string;
  filterError: string | null;
  rowCount: number;
  filteredRowCount: number;
  colCount: number;
  selectedRowCount: number;
  canSave: boolean;
  onOpen: () => void;
  onSave: () => void;
  onAddRow: () => void;
  onAddCol: () => void;
  onDeleteSelected: () => void;
  onFilterChange: (text: string) => void;
  onFilterSubmit: () => void;
  onFilterClear: () => void;
}

export function CsvToolbar({
  fileName, isDirty, filterClause, filterError,
  rowCount, filteredRowCount, colCount,
  selectedRowCount, canSave,
  onOpen, onSave, onAddRow, onAddCol, onDeleteSelected,
  onFilterChange, onFilterSubmit, onFilterClear,
}: CsvToolbarProps) {
  const isFiltered = filteredRowCount !== rowCount;

  return (
    <div className="flex flex-col shrink-0 border-b border-border">
      <div className="flex items-center h-9 px-3 gap-2 bg-surface-1">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px]">
          <FileText size={11} className="text-text-dim shrink-0" />
          <span className="text-xs font-display text-text-muted truncate">{fileName ?? "No file"}</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Unsaved changes" />}
        </div>

        <div className="w-px h-4 bg-border shrink-0" />

        <div className={cn(
          "flex items-center gap-1.5 flex-1 bg-surface-2 border rounded px-2 h-6 transition-colors",
          filterError ? "border-danger/60 focus-within:border-danger" : "border-border focus-within:border-border-active",
        )}>
          <span className="text-[10px] font-mono text-text-dim shrink-0 select-none">WHERE</span>
          <input
            type="text"
            value={filterClause}
            onChange={(e) => onFilterChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onFilterSubmit(); }
              if (e.key === "Escape") { onFilterClear(); }
            }}
            placeholder="age > 30 AND name LIKE 'A%'"
            className="flex-1 bg-transparent text-xs font-mono text-text placeholder:text-text-dim outline-none min-w-0"
          />
          {filterClause && (
            <button onClick={onFilterClear} className="text-text-dim hover:text-text-muted leading-none shrink-0">×</button>
          )}
        </div>

        <span className="text-[11px] font-mono text-text-dim shrink-0">
          {isFiltered
            ? `${filteredRowCount.toLocaleString()}/${rowCount.toLocaleString()}`
            : rowCount.toLocaleString()}{" "}
          rows · {colCount} cols
        </span>

        <div className="w-px h-4 bg-border shrink-0" />

        <div className="flex items-center gap-0.5">
          <ToolBtn icon={<FolderOpen size={11} />} label="Open" onClick={onOpen} />
          <ToolBtn icon={<Save size={11} />} label="Save" onClick={onSave} disabled={!canSave} />
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <ToolBtn icon={<Plus size={11} />} label="Row" onClick={onAddRow} />
          <ToolBtn icon={<Plus size={11} />} label="Col" onClick={onAddCol} />
          {selectedRowCount > 0 && (
            <>
              <div className="w-px h-4 bg-border mx-1 shrink-0" />
              <button onClick={onDeleteSelected} className="flex items-center gap-1 h-6 px-2 text-[11px] font-display text-danger hover:bg-danger/10 rounded transition-colors">
                <Trash2 size={11} />
                Delete {selectedRowCount}
              </button>
            </>
          )}
        </div>
      </div>

      {filterError && (
        <div className="px-3 py-1 text-[11px] font-mono text-danger bg-danger/5 border-t border-danger/20">
          {filterError}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn(
      "flex items-center gap-1 h-6 px-2 text-[11px] font-display text-text-muted hover:text-text hover:bg-surface-2 rounded transition-colors",
      "disabled:opacity-30 disabled:cursor-not-allowed",
    )}>
      {icon}{label}
    </button>
  );
}
