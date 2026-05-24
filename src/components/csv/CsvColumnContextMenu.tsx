import { PencilLine, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvColumnContextMenuProps {
  col: number;
  x: number;
  y: number;
  onRename: (col: number) => void;
  onInsertLeft: (col: number) => void;
  onInsertRight: (col: number) => void;
  onDelete: (col: number) => void;
}

export function CsvColumnContextMenu({ col, x, y, onRename, onInsertLeft, onInsertRight, onDelete }: CsvColumnContextMenuProps) {
  return (
    <div
      className="fixed z-50 bg-surface-1 border border-border rounded-xl shadow-2xl py-1.5 min-w-[164px]"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CtxItem icon={<PencilLine size={11} />} label="Rename" onClick={() => onRename(col)} />
      <CtxItem icon={<ArrowLeft size={11} />} label="Insert Left" onClick={() => onInsertLeft(col)} />
      <CtxItem icon={<ArrowRight size={11} />} label="Insert Right" onClick={() => onInsertRight(col)} />
      <div className="my-1 border-t border-border" />
      <CtxItem icon={<Trash2 size={11} />} label="Delete Column" danger onClick={() => onDelete(col)} />
    </div>
  );
}

function CtxItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-display transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-text-muted hover:text-text hover:bg-surface-2",
      )}
    >
      {icon}{label}
    </button>
  );
}
