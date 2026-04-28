import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ESTIMATED_PAGE_HEIGHT = 1050;
const PAGE_GAP = 16;

interface Options {
  numPages: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  currentPage: number;
  scrollMode: "continuous" | "single";
  isActive: boolean;
  onPageChange: (page: number) => void;
}

export function usePdfVirtualScroll({
  numPages,
  scrollRef,
  currentPage,
  scrollMode,
  isActive,
  onPageChange,
}: Options) {
  // Ref mirror of currentPage — lets effects read the latest value without
  // stale closures and without being listed as dependencies.
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Suppress the scroll tracker while we're programmatically scrolling.
  const suppressTrackerRef = useRef(false);

  // True only during a restore phase (initial load or tab-switch).
  // Gates the getTotalSize re-scroll so normal user scrolling is never interrupted.
  const needsRestoreRef = useRef(false);

  const stabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT + PAGE_GAP,
    overscan: 2,
  });

  // Scroll to a specific page by index. isRestore=true opens a 600 ms window
  // where the getTotalSize effect will keep re-correcting as pages measure in.
  function scrollToPage(page: number, behavior: "auto" | "smooth" = "auto", isRestore = false) {
    if (scrollMode !== "continuous" || numPages === 0) return;
    if (isRestore) needsRestoreRef.current = true;
    suppressTrackerRef.current = true;
    virtualizer.scrollToIndex(page - 1, { align: "start", behavior });
    if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
    stabilizeTimerRef.current = setTimeout(() => {
      suppressTrackerRef.current = false;
      needsRestoreRef.current = false;
    }, 600);
  }

  // Re-scroll when tab becomes active (display:none → display:flex requires rAF).
  useEffect(() => {
    if (!isActive || numPages === 0 || scrollMode !== "continuous") return;
    const raf = requestAnimationFrame(() => {
      scrollToPage(currentPageRef.current, "auto", true);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, numPages, scrollMode]);

  // Scroll to page once virtualizer is ready after a new PDF loads.
  useEffect(() => {
    if (scrollMode !== "continuous" || numPages === 0) return;
    scrollToPage(currentPageRef.current, "auto", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages]);

  // As pages measure in their real heights, virtual positions shift.
  // Re-scroll to correct the drift — only while a restore is in progress.
  useEffect(() => {
    if (scrollMode !== "continuous" || numPages === 0 || !needsRestoreRef.current) return;
    scrollToPage(currentPageRef.current, "auto", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualizer.getTotalSize()]);

  // Track the most-visible page during user scrolling.
  useEffect(() => {
    if (scrollMode !== "continuous" || suppressTrackerRef.current) return;
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const viewTop = el.scrollTop;
    const viewBottom = viewTop + el.clientHeight;
    let best = items[0];
    let bestVisible = 0;
    for (const item of items) {
      const visible = Math.max(0, Math.min(item.end, viewBottom) - Math.max(item.start, viewTop));
      if (visible > bestVisible) { bestVisible = visible; best = item; }
    }
    const page = best.index + 1;
    if (page !== currentPageRef.current) onPageChange(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualizer.scrollOffset]);

  return { virtualizer, scrollToPage };
}
