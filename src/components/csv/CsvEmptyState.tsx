import { Table2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvEmptyStateProps {
  isDragOver: boolean;
  onOpen: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export function CsvEmptyState({ isDragOver, onOpen, onDragOver, onDragLeave, onDrop }: CsvEmptyStateProps) {
  return (
    <div
      className="flex flex-col h-full bg-surface overflow-hidden"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
          <button onClick={onOpen} className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-display rounded-lg transition-colors">
            <FolderOpen size={13} />
            Browse Files
          </button>
          <p className="text-[11px] text-text-dim font-mono tracking-wide">— or drag &amp; drop here —</p>
        </div>
      </div>
    </div>
  );
}
