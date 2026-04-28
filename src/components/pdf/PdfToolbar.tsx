import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, FileText, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Rows2, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScrollMode = "continuous" | "single";

interface ToolbarBtnProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarBtn({ onClick, title, active = false, disabled = false, children }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1 rounded transition-colors disabled:opacity-30",
        active
          ? "text-accent bg-accent-dim"
          : "text-text-muted hover:text-text hover:bg-surface-3"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 shrink-0 bg-border" />;
}

interface PageInputProps {
  currentPage: number;
  numPages: number;
  onGoToPage: (page: number) => void;
}

function PageInput({ currentPage, numPages, onGoToPage }: PageInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(String(currentPage));
    setEditing(true);
  }

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) onGoToPage(n);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-10 text-center text-xs font-mono rounded px-1 py-0.5 outline-none bg-surface-2 border border-accent text-text select-text"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Go to page"
      className="text-xs font-mono text-text-muted hover:text-text hover:bg-surface-3 rounded px-1 py-0.5 transition-colors"
    >
      {currentPage} / {numPages}
    </button>
  );
}

interface PdfToolbarProps {
  fileName: string | null;
  pdfLoaded: boolean;
  loading: boolean;
  currentPage: number;
  numPages: number;
  scale: number;
  scrollMode: ScrollMode;
  onGoHome: () => void;
  onPickFile: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleScrollMode: () => void;
}

export function PdfToolbar({
  fileName, pdfLoaded, loading, currentPage, numPages, scale, scrollMode,
  onGoHome, onPickFile, onPrevPage, onNextPage, onGoToPage, onZoomIn, onZoomOut, onToggleScrollMode,
}: PdfToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 h-10 border-b border-border shrink-0 bg-surface-1">
      <button
        onClick={onGoHome}
        className="flex items-center gap-1 text-xs transition-colors shrink-0 text-text-muted hover:text-text"
      >
        <ArrowLeft size={12} /> Back
      </button>

      <Divider />

      <span className={cn("text-xs font-mono truncate flex-1", fileName ? "text-text" : "text-text-dim")}>
        {fileName ?? "No file open"}
      </span>

      {pdfLoaded && (
        <>
          <ToolbarBtn
            onClick={onToggleScrollMode}
            title={scrollMode === "continuous" ? "Switch to single page" : "Switch to continuous scroll"}
            active={scrollMode === "continuous"}
          >
            {scrollMode === "continuous" ? <Rows2 size={13} /> : <BookOpen size={13} />}
          </ToolbarBtn>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn onClick={onZoomOut} title="Zoom out"><ZoomOut size={13} /></ToolbarBtn>
            <span className="text-xs font-mono w-10 text-center text-text-muted">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarBtn onClick={onZoomIn} title="Zoom in"><ZoomIn size={13} /></ToolbarBtn>
          </div>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn onClick={onPrevPage} disabled={currentPage <= 1} title="Previous page">
              <ChevronLeft size={13} />
            </ToolbarBtn>
            <PageInput currentPage={currentPage} numPages={numPages} onGoToPage={onGoToPage} />
            <ToolbarBtn onClick={onNextPage} disabled={currentPage >= numPages} title="Next page">
              <ChevronRight size={13} />
            </ToolbarBtn>
          </div>
        </>
      )}

      <button
        onClick={onPickFile}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all disabled:opacity-40 shrink-0 bg-surface-2 border border-border text-text hover:border-border-active"
      >
        <FileText size={11} />
        {loading ? "Opening…" : pdfLoaded ? "Open another" : "Open PDF"}
      </button>
    </div>
  );
}
