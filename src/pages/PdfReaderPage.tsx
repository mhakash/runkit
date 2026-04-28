import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Document, Page, pdfjs } from "react-pdf";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import { AlertTriangle, FileText } from "lucide-react";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { usePdfVirtualScroll } from "@/hooks/usePdfVirtualScroll";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { PdfToolbar } from "@/components/pdf/PdfToolbar";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ScrollMode = "continuous" | "single";
const PAGE_GAP = 16;

export function PdfReaderPage() {
  const navigate = useNavigate();
  const { tabId, isActive } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const setPdfState = useTabStore((s) => s.setPdfState);
  const clearPdfState = useTabStore((s) => s.clearPdfState);
  const savedPdfState = useTabStore((s) => s.pdfStates[tabId]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(savedPdfState?.currentPage ?? 1);
  const [scale, setScale] = useState(savedPdfState?.scale ?? 1.0);
  const [scrollMode, setScrollMode] = useState<ScrollMode>(savedPdfState?.scrollMode ?? "continuous");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  function persist(page: number, zoom: number, mode: ScrollMode, fp = filePath) {
    if (fp) setPdfState(tabId, { filePath: fp, currentPage: page, scale: zoom, scrollMode: mode });
  }

  const { virtualizer, scrollToPage } = usePdfVirtualScroll({
    numPages,
    scrollRef,
    currentPage,
    scrollMode,
    isActive,
    onPageChange: (page) => {
      setCurrentPage(page);
      persist(page, scale, scrollMode);
    },
  });

  usePinchZoom({
    scrollRef,
    scale,
    onScale: (next) => {
      setScale(next);
      persist(currentPage, next, scrollMode);
    },
  });

  useEffect(() => {
    if (restoredRef.current || !savedPdfState) return;
    restoredRef.current = true;
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreSession() {
    if (!savedPdfState) return;
    setLoading(true);
    try {
      const fileExists = await exists(savedPdfState.filePath);
      if (!fileExists) {
        setFileNotFound(true);
        setFileName(savedPdfState.filePath.split("/").pop() ?? "document.pdf");
        return;
      }
      await loadPdf(savedPdfState.filePath, savedPdfState.currentPage, savedPdfState.scale, savedPdfState.scrollMode ?? "continuous");
    } catch (e) {
      console.error("Failed to restore PDF session:", e);
      setFileNotFound(true);
      setFileName(savedPdfState.filePath.split("/").pop() ?? "document.pdf");
    } finally {
      setLoading(false);
    }
  }

  async function loadPdf(path: string, page = 1, zoom = 1.0, mode: ScrollMode = "continuous") {
    const bytes = await readFile(path);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    const name = path.split("/").pop() ?? "document.pdf";
    setFileName(name);
    setFilePath(path);
    setCurrentPage(page);
    setScale(zoom);
    setScrollMode(mode);
    setFileNotFound(false);
    setNumPages(0);
    updateTabTitle(tabId, name.replace(/\.pdf$/i, ""));
    setPdfState(tabId, { filePath: path, currentPage: page, scale: zoom, scrollMode: mode });
  }

  async function pickFile() {
    try {
      setError(null);
      const selected = await openDialog({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!selected) return;
      setLoading(true);
      await loadPdf(selected as string, 1, scale, scrollMode);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  function goHome() { updateTabTitle(tabId, "Home"); navigate("/"); }

  function changePage(next: number) {
    const p = Math.max(1, Math.min(numPages, next));
    setCurrentPage(p);
    persist(p, scale, scrollMode);
    scrollToPage(p, "smooth");
  }

  function changeScale(next: number) {
    setScale(next);
    persist(currentPage, next, scrollMode);
  }

  function toggleScrollMode() {
    const next: ScrollMode = scrollMode === "continuous" ? "single" : "continuous";
    setScrollMode(next);
    persist(currentPage, scale, next);
  }

  function dismissNotFound() {
    setFileNotFound(false);
    setFileName(null);
    clearPdfState(tabId);
    updateTabTitle(tabId, "PDF Reader");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PdfToolbar
        fileName={fileName}
        pdfLoaded={!!pdfUrl && numPages > 0}
        loading={loading}
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        scrollMode={scrollMode}
        onGoHome={goHome}
        onPickFile={pickFile}
        onPrevPage={() => changePage(currentPage - 1)}
        onNextPage={() => changePage(currentPage + 1)}
        onZoomIn={() => changeScale(Math.min(3, parseFloat((scale + 0.25).toFixed(2))))}
        onZoomOut={() => changeScale(Math.max(0.5, parseFloat((scale - 0.25).toFixed(2))))}
        onToggleScrollMode={toggleScrollMode}
      />

      <div ref={scrollRef} className="flex-1 overflow-auto bg-surface">

        {error && (
          <div className="text-xs font-mono px-4 py-3 rounded-lg m-4 bg-surface-1 text-danger border border-danger">
            {error}
          </div>
        )}

        {fileNotFound && (
          <div className="max-w-lg mx-auto mt-4 rounded-lg border border-warning bg-surface-1 px-4 py-3 flex items-start gap-3 text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-medium">File not found</p>
              <p className="text-xs mt-0.5 truncate text-text-muted">
                {savedPdfState?.filePath}
              </p>
              <p className="text-xs mt-1 text-text-muted">
                The file may have been moved or deleted.{" "}
                <button onClick={pickFile} className="underline underline-offset-2 text-accent">
                  Open another PDF
                </button>
                {" "}or{" "}
                <button onClick={dismissNotFound} className="underline underline-offset-2 text-text-muted">
                  dismiss
                </button>.
              </p>
            </div>
          </div>
        )}

        {!pdfUrl && !loading && !fileNotFound && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-surface-1 border border-border">
              <FileText size={28} className="text-text-dim" />
            </div>
            <p className="text-sm text-text-muted">
              No PDF open —{" "}
              <button onClick={pickFile} className="underline underline-offset-2 text-accent">
                Open PDF
              </button>{" "}
              to get started.
            </p>
          </div>
        )}

        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-32 text-xs font-mono text-text-muted">
                Loading…
              </div>
            }
          >
            {scrollMode === "single" ? (
              <div className="flex justify-center py-6">
                <Page pageNumber={currentPage} scale={scale} className="shadow-2xl"
                  renderTextLayer renderAnnotationLayer />
              </div>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
                {virtualizer.getVirtualItems().map((item) => (
                  <div
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${item.start}px)`,
                      display: "flex",
                      justifyContent: "center",
                      paddingBottom: PAGE_GAP,
                    }}
                  >
                    <Page pageNumber={item.index + 1} scale={scale} className="shadow-2xl"
                      renderTextLayer renderAnnotationLayer />
                  </div>
                ))}
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
