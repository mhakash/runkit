import { useEffect, useRef } from "react";

interface Options {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  onScale: (next: number) => void;
}

function clampScale(s: number) {
  return Math.min(3, Math.max(0.5, parseFloat(s.toFixed(2))));
}

export function usePinchZoom({ scrollRef, scale, onScale }: Options) {
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(scale);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onScale(clampScale(scale - e.deltaY * 0.008));
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchStartScaleRef.current = scale;
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || pinchStartDistRef.current === null) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      onScale(clampScale(pinchStartScaleRef.current * dist / pinchStartDistRef.current));
    }

    function onTouchEnd() { pinchStartDistRef.current = null; }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollRef, scale, onScale]);
}
