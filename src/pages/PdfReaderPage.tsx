import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Clock, FileText, FolderOpen, BookMarked, AlertTriangle } from "lucide-react";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { PdfToolbar } from "@/components/pdf/PdfToolbar";
import { usePdfControls, type OutlineItem } from "@/hooks/usePdfControls";
import type { RecentPdf } from "@/lib/session";
import "pdfjs-dist/web/pdf_viewer.css";

export function PdfReaderPage() {
  const { tabId, isActive } = useTabContext();
  const recentPdfs = useTabStore((s) => s.recentPdfs);
  const [recentPage, setRecentPage] = useState(0);

  const controls = usePdfControls({ tabId, isActive });
  const { state, actions, refs } = controls;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PdfToolbar controls={controls} />

      <div ref={refs.wrapperRef} className="flex flex-1 overflow-hidden relative bg-surface">
        {/* Docked sidebar */}
        {state.sidebarOpen && !state.sidebarFloat && (
          <OutlineSidebar
            outline={state.outline}
            onNavigate={actions.navigateTo}
            onClose={() => actions.setSidebarOpen(false)}
          />
        )}

        {/* Floating sidebar overlay */}
        {state.sidebarOpen && state.sidebarFloat && (
          <>
            <div className="absolute inset-0 z-10" onClick={() => actions.setSidebarOpen(false)} />
            <div className="absolute top-0 left-0 bottom-0 z-20">
              <OutlineSidebar
                outline={state.outline}
                onNavigate={actions.navigateTo}
                onClose={() => actions.setSidebarOpen(false)}
              />
            </div>
          </>
        )}

        <div className="flex-1 overflow-hidden relative">
          {state.error && (
            <div className="text-xs font-mono px-4 py-3 rounded-lg m-4 bg-surface-1 text-danger border border-danger">
              {state.error}
            </div>
          )}

          {state.fileNotFound && (
            <div className="max-w-lg mx-auto mt-4 rounded-lg border border-warning bg-surface-1 px-4 py-3 flex items-start gap-3 text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-medium">File not found</p>
                <p className="text-xs mt-0.5 truncate text-text-muted">{state.savedFilePath}</p>
                <p className="text-xs mt-1 text-text-muted">
                  The file may have been moved or deleted.{" "}
                  <button onClick={actions.pickFile} className="underline underline-offset-2 text-accent">Open another PDF</button>
                  {" "}or{" "}
                  <button onClick={actions.dismissNotFound} className="underline underline-offset-2 text-text-muted">dismiss</button>.
                </p>
              </div>
            </div>
          )}

          {!state.pdfLoaded && !state.loading && !state.fileNotFound && (
            <RecentPdfList
              recentPdfs={recentPdfs}
              page={recentPage}
              onPageChange={setRecentPage}
              onOpen={(entry) => {
                actions.loadPdf(entry.filePath, entry.currentPage, entry.scale, entry.scrollMode)
                  .catch(() => {});
              }}
              onPickFile={actions.pickFile}
            />
          )}

          {state.loading && (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-text-muted font-mono animate-pulse">Loading…</span>
            </div>
          )}

          {/* PDFViewer container — always mounted so the viewer instance persists */}
          <div
            ref={refs.containerRef}
            id="viewerContainer"
            className="absolute inset-0 overflow-auto"
            style={{ display: state.pdfLoaded ? "block" : "none" }}
          >
            <div ref={refs.viewerDivRef} className="pdfViewer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Outline Sidebar ────────────────────────────────────────────────────────

function OutlineSidebar({
  outline,
  onNavigate,
  onClose,
}: {
  outline: OutlineItem[];
  onNavigate: (dest: string | Array<unknown> | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col w-64 shrink-0 border-r border-border bg-surface-1 h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="flex items-center gap-1.5 text-xs font-display font-medium text-text-muted uppercase tracking-wide">
          <BookMarked size={12} />
          Bookmarks
        </span>
        <button
          onClick={onClose}
          className="text-text-dim hover:text-text-muted transition-colors p-0.5 rounded"
        >
          <ChevronLeft size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {outline.map((item, i) => (
          <OutlineNode key={i} item={item} depth={0} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function OutlineNode({
  item,
  depth,
  onNavigate,
}: {
  item: OutlineItem;
  depth: number;
  onNavigate: (dest: string | Array<unknown> | null) => void;
}): ReactNode {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = item.items && item.items.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 group hover:bg-surface-2 transition-colors cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => {
          if (item.dest) onNavigate(item.dest);
          if (hasChildren) setExpanded((e) => !e);
        }}
      >
        {hasChildren ? (
          <ChevronDown
            size={11}
            className={`shrink-0 text-text-dim transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        ) : (
          <span className="w-[11px] shrink-0" />
        )}
        <span
          className={[
            "text-xs leading-snug truncate flex-1",
            item.bold ? "font-semibold" : "",
            item.italic ? "italic" : "",
            item.dest ? "text-text group-hover:text-accent" : "text-text-muted",
          ].join(" ")}
        >
          {item.title || "(untitled)"}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {item.items.map((child, i) => (
            <OutlineNode key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function RecentPdfList({
  recentPdfs,
  page,
  onPageChange,
  onOpen,
  onPickFile,
}: {
  recentPdfs: RecentPdf[];
  page: number;
  onPageChange: (p: number) => void;
  onOpen: (entry: RecentPdf) => void;
  onPickFile: () => void;
}) {
  const sorted = [...recentPdfs].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const slice = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="flex flex-col items-center justify-start h-full pt-12 px-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-display font-medium text-text-muted tracking-wide uppercase">Recent PDFs</h2>
          <button
            onClick={onPickFile}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <FolderOpen size={13} />
            Open PDF
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-12 text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-surface-1 border border-border">
              <FileText size={24} className="text-text-dim" />
            </div>
            <p className="text-sm text-text-muted">
              No recent PDFs —{" "}
              <button onClick={onPickFile} className="underline underline-offset-2 text-accent">
                open one
              </button>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              {slice.map((entry, i) => (
                <button
                  key={entry.filePath}
                  onClick={() => onOpen(entry)}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors group",
                    i < slice.length - 1 ? "border-b border-border" : "",
                  ].join(" ")}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-surface-2 border border-border shrink-0 group-hover:border-border-active transition-colors">
                    <FileText size={14} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{entry.name}</p>
                    <p className="text-xs text-text-dim font-mono truncate mt-0.5">{entry.filePath}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-accent font-mono">p.{entry.currentPage}/{entry.numPages}</span>
                    <span className="flex items-center gap-1 text-xs text-text-dim font-mono">
                      <Clock size={10} />
                      {formatRelativeTime(entry.lastOpenedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-text-dim font-mono">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                    className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-text-dim font-mono px-1">{page + 1}/{totalPages}</span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => onPageChange(page + 1)}
                    className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
