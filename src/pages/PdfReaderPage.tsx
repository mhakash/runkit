import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { PDFViewer, EventBus, PDFLinkService, ScrollMode as PdfScrollMode } from "pdfjs-dist/web/pdf_viewer.mjs";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import { AlertTriangle, FileText } from "lucide-react";
import { useTabStore } from "@/hooks/useTabStore";
import { useTabContext } from "@/components/layout/TabContext";
import { PdfToolbar } from "@/components/pdf/PdfToolbar";
import "pdfjs-dist/web/pdf_viewer.css";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ScrollMode = "continuous" | "single";

export function PdfReaderPage() {
  const navigate = useNavigate();
  const { tabId, isActive } = useTabContext();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const setPdfState = useTabStore((s) => s.setPdfState);
  const clearPdfState = useTabStore((s) => s.clearPdfState);
  const savedPdfState = useTabStore((s) => s.pdfStates[tabId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<PDFViewer | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const linkServiceRef = useRef<PDFLinkService | null>(null);
  const restoredRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(savedPdfState?.currentPage ?? 1);
  const [scale, setScale] = useState(savedPdfState?.scale ?? 1.0);
  const [scrollMode, setScrollMode] = useState<ScrollMode>(savedPdfState?.scrollMode ?? "continuous");
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);

  // Keep refs in sync for use inside callbacks without stale closures
  const currentPageRef = useRef(currentPage);
  const scaleRef = useRef(scale);
  const scrollModeRef = useRef(scrollMode);
  const filePathRef = useRef(filePath);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { scrollModeRef.current = scrollMode; }, [scrollMode]);
  useEffect(() => { filePathRef.current = filePath; }, [filePath]);

  function persist(page: number, zoom: number, mode: ScrollMode, fp = filePathRef.current) {
    if (fp) setPdfState(tabId, { filePath: fp, currentPage: page, scale: zoom, scrollMode: mode });
  }

  // ── Init PDFViewer once on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !viewerDivRef.current) return;

    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });
    const viewer = new PDFViewer({
      container: containerRef.current,
      viewer: viewerDivRef.current,
      eventBus,
      linkService,
      textLayerMode: 1,
      annotationMode: 1,
      removePageBorders: false,
    });
    linkService.setViewer(viewer);
    linkServiceRef.current = linkService;

    eventBus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
      setCurrentPage(pageNumber);
      persist(pageNumber, scaleRef.current, scrollModeRef.current);
    });

    eventBus.on("scalechanging", ({ scale: s }: { scale: number }) => {
      const rounded = parseFloat(s.toFixed(2));
      setScale(rounded);
      persist(currentPageRef.current, rounded, scrollModeRef.current);
    });

    eventBusRef.current = eventBus;
    pdfViewerRef.current = viewer;

    return () => {
      viewer.cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore session on first mount ─────────────────────────────────────────
  useEffect(() => {
    if (restoredRef.current || !savedPdfState || !pdfViewerRef.current) return;
    restoredRef.current = true;
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-scroll to correct page when tab becomes active ───────────────────────
  useEffect(() => {
    if (!isActive || !pdfViewerRef.current || !pdfLoaded) return;
    pdfViewerRef.current.currentPageNumber = currentPageRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
      await loadPdf(
        savedPdfState.filePath,
        savedPdfState.currentPage,
        savedPdfState.scale,
        savedPdfState.scrollMode ?? "continuous",
      );
    } catch (e) {
      console.error("Failed to restore PDF session:", e);
      setFileNotFound(true);
      setFileName(savedPdfState.filePath.split("/").pop() ?? "document.pdf");
    } finally {
      setLoading(false);
    }
  }

  async function loadPdf(path: string, page = 1, zoom = 1.0, mode: ScrollMode = "continuous") {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;

    const bytes = await readFile(path);
    const loadingTask = getDocument({ data: bytes });
    const pdfDoc = await loadingTask.promise;

    viewer.scrollMode = mode === "single" ? PdfScrollMode.PAGE : PdfScrollMode.VERTICAL;
    viewer.setDocument(pdfDoc);
    linkServiceRef.current?.setDocument(pdfDoc, null);
    viewer.currentScale = zoom;

    const name = path.split("/").pop() ?? "document.pdf";
    setFileName(name);
    setFilePath(path);
    filePathRef.current = path;
    setCurrentPage(page);
    setScale(zoom);
    setScrollMode(mode);
    setNumPages(pdfDoc.numPages);
    setFileNotFound(false);
    setPdfLoaded(true);
    updateTabTitle(tabId, name.replace(/\.pdf$/i, ""));
    setPdfState(tabId, { filePath: path, currentPage: page, scale: zoom, scrollMode: mode });

    // Wait for first render then jump to saved page
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (viewer) viewer.currentPageNumber = page;
      });
    });
  }

  async function pickFile() {
    try {
      setError(null);
      const selected = await openDialog({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!selected) return;
      setLoading(true);
      await loadPdf(selected as string, 1, scaleRef.current, scrollModeRef.current);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function goHome() { updateTabTitle(tabId, "Home"); navigate("/"); }

  const changePage = useCallback((next: number) => {
    const viewer = pdfViewerRef.current;
    if (!viewer || !pdfLoaded) return;
    const p = Math.max(1, Math.min(numPages, next));
    viewer.currentPageNumber = p;
  }, [pdfLoaded, numPages]);

  const changeScale = useCallback((next: number) => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    viewer.currentScale = next;
  }, []);

  function toggleScrollMode() {
    const next: ScrollMode = scrollMode === "continuous" ? "single" : "continuous";
    setScrollMode(next);
    persist(currentPage, scale, next);
    const viewer = pdfViewerRef.current;
    if (viewer) {
      viewer.scrollMode = next === "single" ? PdfScrollMode.PAGE : PdfScrollMode.VERTICAL;
    }
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
        pdfLoaded={pdfLoaded}
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

      <div className="flex-1 overflow-hidden relative bg-surface">
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
              <p className="text-xs mt-0.5 truncate text-text-muted">{savedPdfState?.filePath}</p>
              <p className="text-xs mt-1 text-text-muted">
                The file may have been moved or deleted.{" "}
                <button onClick={pickFile} className="underline underline-offset-2 text-accent">Open another PDF</button>
                {" "}or{" "}
                <button onClick={dismissNotFound} className="underline underline-offset-2 text-text-muted">dismiss</button>.
              </p>
            </div>
          </div>
        )}

        {!pdfLoaded && !loading && !fileNotFound && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-surface-1 border border-border">
              <FileText size={28} className="text-text-dim" />
            </div>
            <p className="text-sm text-text-muted">
              No PDF open —{" "}
              <button onClick={pickFile} className="underline underline-offset-2 text-accent">Open PDF</button>{" "}
              to get started.
            </p>
          </div>
        )}

        {/* PDFViewer container — always mounted so the viewer instance persists */}
        <div
          ref={containerRef}
          id="viewerContainer"
          className="absolute inset-0 overflow-auto"
          style={{ display: pdfLoaded ? "block" : "none" }}
        >
          <div ref={viewerDivRef} className="pdfViewer" />
        </div>
      </div>
    </div>
  );
}
