import {
  ArrowLeft, FileText, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Rows2, BookOpen,
} from "lucide-react";

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
      className="p-1 rounded transition-colors disabled:opacity-30"
      style={{
        color: active ? "var(--color-accent)" : "var(--color-text-muted)",
        background: active ? "var(--color-accent-dim)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = active ? "var(--color-accent)" : "var(--color-text-muted)";
        (e.currentTarget as HTMLElement).style.background = active ? "var(--color-accent-dim)" : "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 shrink-0" style={{ background: "var(--color-border)" }} />;
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
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleScrollMode: () => void;
}

export function PdfToolbar({
  fileName, pdfLoaded, loading, currentPage, numPages, scale, scrollMode,
  onGoHome, onPickFile, onPrevPage, onNextPage, onZoomIn, onZoomOut, onToggleScrollMode,
}: PdfToolbarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 h-10 border-b shrink-0"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <button
        onClick={onGoHome}
        className="flex items-center gap-1 text-xs transition-colors shrink-0"
        style={{ color: "var(--color-text-muted)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)")}
      >
        <ArrowLeft size={12} /> Back
      </button>

      <Divider />

      <span
        className="text-xs font-mono truncate flex-1"
        style={{ color: fileName ? "var(--color-text)" : "var(--color-text-dim)" }}
      >
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
            <span className="text-xs font-mono w-10 text-center" style={{ color: "var(--color-text-muted)" }}>
              {Math.round(scale * 100)}%
            </span>
            <ToolbarBtn onClick={onZoomIn} title="Zoom in"><ZoomIn size={13} /></ToolbarBtn>
          </div>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn onClick={onPrevPage} disabled={currentPage <= 1} title="Previous page">
              <ChevronLeft size={13} />
            </ToolbarBtn>
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
              {currentPage} / {numPages}
            </span>
            <ToolbarBtn onClick={onNextPage} disabled={currentPage >= numPages} title="Next page">
              <ChevronRight size={13} />
            </ToolbarBtn>
          </div>
        </>
      )}

      <button
        onClick={onPickFile}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all disabled:opacity-40 shrink-0"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-active)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)")}
      >
        <FileText size={11} />
        {loading ? "Opening…" : pdfLoaded ? "Open another" : "Open PDF"}
      </button>
    </div>
  );
}
