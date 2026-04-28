import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Document, Page, pdfjs } from "react-pdf";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function PdfReaderPage() {
  const navigate = useNavigate();
  const { tabId } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const setPdfState = useTabStore((s) => s.setPdfState);
  const clearPdfState = useTabStore((s) => s.clearPdfState);
  const savedPdfState = useTabStore((s) => s.pdfStates[tabId]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(savedPdfState?.currentPage ?? 1);
  const [scale, setScale] = useState(savedPdfState?.scale ?? 1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const restoredRef = useRef(false);

  // Restore previous session on first mount
  useEffect(() => {
    if (restoredRef.current || !savedPdfState) return;
    restoredRef.current = true;

    async function restore() {
      if (!savedPdfState) return;
      setLoading(true);
      try {
        const fileExists = await exists(savedPdfState.filePath);
        if (!fileExists) {
          setFileNotFound(true);
          const name = savedPdfState.filePath.split("/").pop() ?? "document.pdf";
          setFileName(name);
          return;
        }
        await loadPdf(savedPdfState.filePath, savedPdfState.currentPage, savedPdfState.scale);
      } catch (e) {
        console.error("Failed to restore PDF session:", e);
        setFileNotFound(true);
        const name = savedPdfState.filePath.split("/").pop() ?? "document.pdf";
        setFileName(name);
      } finally {
        setLoading(false);
      }
    }

    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPdf(path: string, page = 1, zoom = 1.0) {
    const bytes = await readFile(path);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    const name = path.split("/").pop() ?? "document.pdf";
    setFileName(name);
    setFilePath(path);
    setCurrentPage(page);
    setScale(zoom);
    setFileNotFound(false);
    updateTabTitle(tabId, name.replace(/\.pdf$/i, ""));
    setPdfState(tabId, { filePath: path, currentPage: page, scale: zoom });
  }

  async function pickFile() {
    try {
      setError(null);
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!selected) return;
      setLoading(true);
      await loadPdf(selected as string);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  function goHome() {
    updateTabTitle(tabId, "Home");
    navigate("/");
  }

  function changePage(next: number) {
    setCurrentPage(next);
    if (filePath) setPdfState(tabId, { filePath, currentPage: next, scale });
  }

  function changeScale(next: number) {
    setScale(next);
    if (filePath) setPdfState(tabId, { filePath, currentPage, scale: next });
  }

  function prevPage() { changePage(Math.max(1, currentPage - 1)); }
  function nextPage() { changePage(Math.min(numPages, currentPage + 1)); }
  function zoomIn() { changeScale(Math.min(3, parseFloat((scale + 0.25).toFixed(2)))); }
  function zoomOut() { changeScale(Math.max(0.5, parseFloat((scale - 0.25).toFixed(2)))); }

  function dismissNotFound() {
    setFileNotFound(false);
    setFileName(null);
    clearPdfState(tabId);
    updateTabTitle(tabId, "PDF Reader");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 h-10 border-b shrink-0"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
      >
        <button
          onClick={goHome}
          className="flex items-center gap-1 text-xs transition-colors shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)")}
        >
          <ArrowLeft size={12} />
          Back
        </button>

        <div className="w-px h-4 shrink-0" style={{ background: "var(--color-border)" }} />

        <span
          className="text-xs font-mono truncate flex-1"
          style={{ color: fileName ? "var(--color-text)" : "var(--color-text-dim)" }}
        >
          {fileName ?? "No file open"}
        </span>

        {pdfUrl && (
          <>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={zoomOut} className="p-1 rounded transition-colors" style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title="Zoom out"><ZoomOut size={13} /></button>
              <span className="text-xs font-mono w-10 text-center" style={{ color: "var(--color-text-muted)" }}>
                {Math.round(scale * 100)}%
              </span>
              <button onClick={zoomIn} className="p-1 rounded transition-colors" style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title="Zoom in"><ZoomIn size={13} /></button>
            </div>
            <div className="w-px h-4 shrink-0" style={{ background: "var(--color-border)" }} />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={prevPage} disabled={currentPage <= 1}
                className="p-1 rounded transition-colors disabled:opacity-30" style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)"; }}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <ChevronLeft size={13} /></button>
              <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{currentPage} / {numPages}</span>
              <button onClick={nextPage} disabled={currentPage >= numPages}
                className="p-1 rounded transition-colors disabled:opacity-30" style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { if (currentPage < numPages) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)"; }}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <ChevronRight size={13} /></button>
            </div>
          </>
        )}

        <button onClick={pickFile} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all disabled:opacity-40 shrink-0"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-active)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)")}>
          <FileText size={11} />
          {loading ? "Opening…" : pdfUrl ? "Open another" : "Open PDF"}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-6 gap-4" style={{ background: "var(--color-surface)" }}>
        {error && (
          <div className="text-xs font-mono px-4 py-3 rounded-lg mt-2"
            style={{ background: "var(--color-surface-1)", color: "var(--color-danger)", border: "1px solid var(--color-danger)" }}>
            {error}
          </div>
        )}

        {/* File not found banner */}
        {fileNotFound && (
          <div className="w-full max-w-lg mx-auto mt-2 rounded-lg border px-4 py-3 flex items-start gap-3"
            style={{ background: "var(--color-surface-1)", borderColor: "var(--color-warning)", color: "var(--color-warning)" }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-medium">File not found</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                {savedPdfState?.filePath}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                The file may have been moved or deleted.{" "}
                <button onClick={pickFile} className="underline underline-offset-2" style={{ color: "var(--color-accent)" }}>
                  Open another PDF
                </button>
                {" "}or{" "}
                <button onClick={dismissNotFound} className="underline underline-offset-2" style={{ color: "var(--color-text-muted)" }}>
                  dismiss
                </button>.
              </p>
            </div>
          </div>
        )}

        {!pdfUrl && !loading && !fileNotFound && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}>
              <FileText size={28} style={{ color: "var(--color-text-dim)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No PDF open —{" "}
              <button onClick={pickFile} className="underline underline-offset-2" style={{ color: "var(--color-accent)" }}>
                Open PDF
              </button>{" "}
              to get started.
            </p>
          </div>
        )}

        {pdfUrl && (
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>Loading PDF…</div>}>
            <Page pageNumber={currentPage} scale={scale} className="shadow-2xl" renderTextLayer renderAnnotationLayer />
          </Document>
        )}
      </div>
    </div>
  );
}
