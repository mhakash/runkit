import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { PDFViewer, EventBus, PDFLinkService, ScrollMode as PdfScrollMode } from "pdfjs-dist/web/pdf_viewer.mjs";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import { useTabStore } from "@/hooks/useTabStore";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ScrollMode = "continuous" | "single";

export interface OutlineItem {
  title: string;
  dest: string | Array<unknown> | null;
  items: OutlineItem[];
  bold: boolean;
  italic: boolean;
}

export interface PdfControls {
  state: {
    fileName: string | null;
    filePath: string | null;
    numPages: number;
    currentPage: number;
    scale: number;
    scrollMode: ScrollMode;
    pdfLoaded: boolean;
    loading: boolean;
    error: string | null;
    fileNotFound: boolean;
    sidebarOpen: boolean;
    sidebarFloat: boolean;
    outline: OutlineItem[];
    canGoBack: boolean;
    canGoForward: boolean;
    savedFilePath: string | undefined;
  };
  actions: {
    pickFile: () => void;
    goHome: () => void;
    changePage: (next: number) => void;
    changeScale: (next: number) => void;
    toggleScrollMode: () => void;
    navigateTo: (dest: string | Array<unknown> | null) => void;
    goToPage: (page: number) => void;
    goBack: () => void;
    goForward: () => void;
    dismissNotFound: () => void;
    setSidebarOpen: (open: boolean) => void;
    loadPdf: (path: string, page?: number, zoom?: number, mode?: ScrollMode) => Promise<void>;
  };
  refs: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    viewerDivRef: React.RefObject<HTMLDivElement | null>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
  };
}

interface UsePdfControlsOptions {
  tabId: string;
  isActive: boolean;
}

export function usePdfControls({ tabId, isActive }: UsePdfControlsOptions): PdfControls {
  const navigate = useNavigate();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const setPdfState = useTabStore((s) => s.setPdfState);
  const clearPdfState = useTabStore((s) => s.clearPdfState);
  const upsertRecentPdf = useTabStore((s) => s.upsertRecentPdf);
  const savedPdfState = useTabStore((s) => s.pdfStates[tabId]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarFloat, setSidebarFloat] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
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
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<PDFViewer | null>(null);
  const linkServiceRef = useRef<PDFLinkService | null>(null);
  const restoredRef = useRef(false);

  // Kept in sync so event bus callbacks don't capture stale closures
  const currentPageRef = useRef(currentPage);
  const scaleRef = useRef(scale);
  const scrollModeRef = useRef(scrollMode);
  const filePathRef = useRef(filePath);
  const fileNameRef = useRef<string | null>(null);
  const numPagesRef = useRef(0);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { scrollModeRef.current = scrollMode; }, [scrollMode]);
  useEffect(() => { filePathRef.current = filePath; }, [filePath]);
  useEffect(() => { fileNameRef.current = fileName; }, [fileName]);
  useEffect(() => { numPagesRef.current = numPages; }, [numPages]);

  // Navigation history — in-memory only, not persisted
  const navHistoryRef = useRef<number[]>([]);
  const navIndexRef = useRef(-1);
  const isProgrammaticNavRef = useRef(false);

  function syncNavState() {
    setCanGoBack(navIndexRef.current > 0);
    setCanGoForward(navIndexRef.current < navHistoryRef.current.length - 1);
  }

  // Call before any jump navigation to record origin and arm the history push
  function pushCurrentAndSetFlag() {
    const current = currentPageRef.current;
    const lastEntry = navHistoryRef.current[navIndexRef.current];
    if (current !== lastEntry) {
      navHistoryRef.current = navHistoryRef.current.slice(0, navIndexRef.current + 1);
      navHistoryRef.current.push(current);
      navIndexRef.current = navHistoryRef.current.length - 1;
      syncNavState();
    }
    isProgrammaticNavRef.current = true;
  }

  function persist(page: number, zoom: number, mode: ScrollMode, fp = filePathRef.current) {
    if (!fp) return;
    setPdfState(tabId, { filePath: fp, currentPage: page, scale: zoom, scrollMode: mode });
    if (fileNameRef.current) {
      upsertRecentPdf({ filePath: fp, name: fileNameRef.current, currentPage: page, numPages: numPagesRef.current, scale: zoom, scrollMode: mode });
    }
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

    // Intercept all destination navigations (internal links, TOC clicks, etc.)
    // so they're treated identically to explicit navigateTo() calls.
    const originalGoTo = linkService.goToDestination.bind(linkService);
    linkService.goToDestination = (dest) => {
      pushCurrentAndSetFlag();
      return originalGoTo(dest);
    };

    linkServiceRef.current = linkService;

    eventBus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
      setCurrentPage(pageNumber);
      persist(pageNumber, scaleRef.current, scrollModeRef.current);

      if (isProgrammaticNavRef.current) {
        isProgrammaticNavRef.current = false;
        navHistoryRef.current = navHistoryRef.current.slice(0, navIndexRef.current + 1);
        navHistoryRef.current.push(pageNumber);
        navIndexRef.current = navHistoryRef.current.length - 1;
        syncNavState();
      }
    });

    eventBus.on("scalechanging", ({ scale: s }: { scale: number }) => {
      const rounded = parseFloat(s.toFixed(2));
      setScale(rounded);
      persist(currentPageRef.current, rounded, scrollModeRef.current);
    });

    pdfViewerRef.current = viewer;
    return () => { viewer.cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore session on first mount ─────────────────────────────────────────
  useEffect(() => {
    if (restoredRef.current || !savedPdfState || !pdfViewerRef.current) return;
    restoredRef.current = true;
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-scroll to correct page when tab becomes active ──────────────────────
  useEffect(() => {
    if (!isActive || !pdfViewerRef.current || !pdfLoaded) return;
    pdfViewerRef.current.currentPageNumber = currentPageRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── Float sidebar when container is narrow ─────────────────────────────────
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const narrow = entry.contentRect.width < 600;
      setSidebarFloat(narrow);
      if (narrow) setSidebarOpen(false);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
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
    const viewer = pdfViewerRef.current;
    if (!viewer) return;

    const bytes = await readFile(path);
    const pdfDoc = await getDocument({ data: bytes }).promise;

    viewer.scrollMode = mode === "single" ? PdfScrollMode.PAGE : PdfScrollMode.VERTICAL;
    viewer.setDocument(pdfDoc);
    linkServiceRef.current?.setDocument(pdfDoc, null);
    viewer.currentScale = zoom;

    const name = path.split("/").pop() ?? "document.pdf";
    setFileName(name);
    setFilePath(path);
    filePathRef.current = path;
    fileNameRef.current = name;
    setCurrentPage(page);
    setScale(zoom);
    setScrollMode(mode);
    setNumPages(pdfDoc.numPages);
    numPagesRef.current = pdfDoc.numPages;
    setFileNotFound(false);
    setPdfLoaded(true);
    updateTabTitle(tabId, name.replace(/\.pdf$/i, ""));
    setPdfState(tabId, { filePath: path, currentPage: page, scale: zoom, scrollMode: mode });
    upsertRecentPdf({ filePath: path, name, currentPage: page, numPages: pdfDoc.numPages, scale: zoom, scrollMode: mode });

    const rawOutline = await pdfDoc.getOutline();
    setOutline((rawOutline as OutlineItem[]) ?? []);

    // Seed history with the opening page so back can return to it
    navHistoryRef.current = [page];
    navIndexRef.current = 0;
    setCanGoBack(false);
    setCanGoForward(false);

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

  function goHome() {
    updateTabTitle(tabId, "Home");
    navigate("/");
  }

  const changePage = useCallback((next: number) => {
    const viewer = pdfViewerRef.current;
    if (!viewer || !pdfLoaded) return;
    viewer.currentPageNumber = Math.max(1, Math.min(numPagesRef.current, next));
  }, [pdfLoaded]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !pdfLoaded) return;
    const isContinuous = scrollModeRef.current === "continuous";

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const container = containerRef.current;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (isContinuous) container?.scrollBy({ top: 100 });
          else changePage(currentPageRef.current + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isContinuous) container?.scrollBy({ top: -100 });
          else changePage(currentPageRef.current - 1);
          break;
        case " ":
          e.preventDefault();
          if (isContinuous) {
            const delta = container ? container.clientHeight - 40 : 400;
            container?.scrollBy({ top: e.shiftKey ? -delta : delta, behavior: "smooth" });
          } else {
            changePage(currentPageRef.current + (e.shiftKey ? -1 : 1));
          }
          break;
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          changePage(currentPageRef.current + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          changePage(currentPageRef.current - 1);
          break;
        case "Home":
          e.preventDefault();
          changePage(1);
          break;
        case "End":
          e.preventDefault();
          changePage(numPagesRef.current);
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive, pdfLoaded, scrollMode, changePage]);

  const changeScale = useCallback((next: number) => {
    const viewer = pdfViewerRef.current;
    if (viewer) viewer.currentScale = next;
  }, []);

  function toggleScrollMode() {
    const next: ScrollMode = scrollMode === "continuous" ? "single" : "continuous";
    setScrollMode(next);
    persist(currentPage, scale, next);
    const viewer = pdfViewerRef.current;
    if (viewer) viewer.scrollMode = next === "single" ? PdfScrollMode.PAGE : PdfScrollMode.VERTICAL;
  }

  function navigateTo(dest: string | Array<unknown> | null) {
    if (!dest || !linkServiceRef.current) return;
    // goToDestination is already wrapped to call pushCurrentAndSetFlag
    linkServiceRef.current.goToDestination(dest as string | unknown[]);
  }

  function goToPage(page: number) {
    const viewer = pdfViewerRef.current;
    if (!viewer || !pdfLoaded) return;
    pushCurrentAndSetFlag();
    viewer.currentPageNumber = Math.max(1, Math.min(numPagesRef.current, page));
  }

  function goBack() {
    if (navIndexRef.current <= 0) return;
    navIndexRef.current--;
    const target = navHistoryRef.current[navIndexRef.current];
    const viewer = pdfViewerRef.current;
    if (viewer) viewer.currentPageNumber = target;
    syncNavState();
  }

  function goForward() {
    if (navIndexRef.current >= navHistoryRef.current.length - 1) return;
    navIndexRef.current++;
    const target = navHistoryRef.current[navIndexRef.current];
    const viewer = pdfViewerRef.current;
    if (viewer) viewer.currentPageNumber = target;
    syncNavState();
  }

  function dismissNotFound() {
    setFileNotFound(false);
    setFileName(null);
    clearPdfState(tabId);
    updateTabTitle(tabId, "PDF Reader");
  }

  return {
    state: {
      fileName,
      filePath,
      numPages,
      currentPage,
      scale,
      scrollMode,
      pdfLoaded,
      loading,
      error,
      fileNotFound,
      sidebarOpen,
      sidebarFloat,
      outline,
      canGoBack,
      canGoForward,
      savedFilePath: savedPdfState?.filePath,
    },
    actions: {
      pickFile,
      goHome,
      changePage,
      changeScale,
      toggleScrollMode,
      navigateTo,
      goToPage,
      goBack,
      goForward,
      dismissNotFound,
      setSidebarOpen,
      loadPdf,
    },
    refs: {
      containerRef,
      viewerDivRef,
      wrapperRef,
    },
  };
}
