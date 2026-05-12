import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, FileText, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Rows2, BookOpen, PanelLeft, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfControls } from "@/hooks/usePdfControls";

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

function PageInput({ controls }: { controls: PdfControls }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(String(controls.state.currentPage));
    setEditing(true);
  }

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) controls.actions.goToPage(n);
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
      {controls.state.currentPage} / {controls.state.numPages}
    </button>
  );
}

export function PdfToolbar({ controls }: { controls: PdfControls }) {
  const { state, actions } = controls;

  return (
    <div className="flex items-center gap-3 px-4 h-10 border-b border-border shrink-0 bg-surface-1">
      <button
        onClick={actions.goHome}
        className="flex items-center gap-1 text-xs transition-colors shrink-0 text-text-muted hover:text-text"
      >
        <ArrowLeft size={12} /> Back
      </button>

      <Divider />

      {state.pdfLoaded && (
        <>
          <ToolbarBtn
            onClick={() => actions.setSidebarOpen(!state.sidebarOpen)}
            title={state.sidebarOpen ? "Close bookmarks" : "Open bookmarks"}
            active={state.sidebarOpen}
            disabled={state.outline.length === 0}
          >
            <PanelLeft size={13} />
          </ToolbarBtn>
          <Divider />
        </>
      )}

      <span className={cn("text-xs font-mono truncate flex-1", state.fileName ? "text-text" : "text-text-dim")}>
        {state.fileName ?? "No file open"}
      </span>

      {state.pdfLoaded && (
        <>
          <ToolbarBtn
            onClick={actions.toggleScrollMode}
            title={state.scrollMode === "continuous" ? "Switch to single page" : "Switch to continuous scroll"}
            active={state.scrollMode === "continuous"}
          >
            {state.scrollMode === "continuous" ? <Rows2 size={13} /> : <BookOpen size={13} />}
          </ToolbarBtn>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn
              onClick={() => actions.changeScale(Math.max(0.5, parseFloat((state.scale - 0.25).toFixed(2))))}
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </ToolbarBtn>
            <span className="text-xs font-mono w-10 text-center text-text-muted">
              {Math.round(state.scale * 100)}%
            </span>
            <ToolbarBtn
              onClick={() => actions.changeScale(Math.min(3, parseFloat((state.scale + 0.25).toFixed(2))))}
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </ToolbarBtn>
          </div>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn onClick={actions.goBack} disabled={!state.canGoBack} title="Go back">
              <Undo2 size={13} />
            </ToolbarBtn>
            <ToolbarBtn onClick={actions.goForward} disabled={!state.canGoForward} title="Go forward">
              <Redo2 size={13} />
            </ToolbarBtn>
          </div>

          <Divider />

          <div className="flex items-center gap-1 shrink-0">
            <ToolbarBtn
              onClick={() => actions.changePage(state.currentPage - 1)}
              disabled={state.currentPage <= 1}
              title="Previous page"
            >
              <ChevronLeft size={13} />
            </ToolbarBtn>
            <PageInput controls={controls} />
            <ToolbarBtn
              onClick={() => actions.changePage(state.currentPage + 1)}
              disabled={state.currentPage >= state.numPages}
              title="Next page"
            >
              <ChevronRight size={13} />
            </ToolbarBtn>
          </div>
        </>
      )}

      {!state.pdfLoaded && (
        <button
          onClick={actions.pickFile}
          disabled={state.loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all disabled:opacity-40 shrink-0 bg-surface-2 border border-border text-text hover:border-border-active"
        >
          <FileText size={11} />
          {state.loading ? "Opening…" : "Open PDF"}
        </button>
      )}
    </div>
  );
}
