"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type UseInitialHorizontalEdgeScrollOptions = {
  debugLabel: string;
  enabled?: boolean;
};

function getEndOffset(element: HTMLElement) {
  return Math.max(0, element.scrollWidth - element.clientWidth);
}

export function useInitialHorizontalEdgeScroll({
  debugLabel,
  enabled = true,
}: UseInitialHorizontalEdgeScrollOptions) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const settleFrameRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const hasEverAlignedRef = useRef(!enabled);
  const hasUserScrolledRef = useRef(false);
  const [isInitialPositioned, setIsInitialPositioned] = useState(!enabled);

  const cancelScheduledFrames = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (settleFrameRef.current !== null) {
      window.cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }

    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const alignToEnd = useCallback(
    (reason: string) => {
      const scroller = scrollerRef.current;
      if (!scroller) {
        return;
      }

      const clientWidth = scroller.clientWidth;
      const scrollWidth = scroller.scrollWidth;
      const initialScrollLeft = scroller.scrollLeft;
      const targetScrollLeft = getEndOffset(scroller);

      console.log("[frequency][timeline-scroll]", {
        clientWidth,
        debugLabel,
        event: "apply_initial_scroll_start",
        initialScrollLeft,
        reason,
        scrollWidth,
        targetScrollLeft,
      });

      isProgrammaticScrollRef.current = true;
      scroller.scrollLeft = targetScrollLeft;

      settleFrameRef.current = window.requestAnimationFrame(() => {
        const finalTargetScrollLeft = getEndOffset(scroller);
        scroller.scrollLeft = finalTargetScrollLeft;

        const finalScrollLeft = scroller.scrollLeft;

        console.log("[frequency][timeline-scroll]", {
          clientWidth: scroller.clientWidth,
          debugLabel,
          event: "apply_initial_scroll_complete",
          finalScrollLeft,
          finalTargetScrollLeft,
          reason,
          scrollWidth: scroller.scrollWidth,
        });

        isProgrammaticScrollRef.current = false;
        hasEverAlignedRef.current = true;
        if (fallbackTimeoutRef.current !== null) {
          window.clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        setIsInitialPositioned(true);
      });
    },
    [debugLabel],
  );

  const scheduleAlignment = useCallback(
    (reason: string) => {
      if (!enabled || hasUserScrolledRef.current) {
        return;
      }

      cancelScheduledFrames();

      fallbackTimeoutRef.current = window.setTimeout(() => {
        console.log("[frequency][timeline-scroll]", {
          debugLabel,
          event: "apply_initial_scroll_fallback_visible",
        });
        setIsInitialPositioned(true);
      }, 220);

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = window.requestAnimationFrame(() => {
          alignToEnd(reason);
        });
      });
    },
    [alignToEnd, cancelScheduledFrames, debugLabel, enabled],
  );

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const scroller = scrollerRef.current;
    const content = contentRef.current;

    if (!scroller || !content) {
      return;
    }

    scheduleAlignment("mount");

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const currentScroller = scrollerRef.current;
      if (!currentScroller) {
        return;
      }

      const distanceFromEnd = Math.abs(
        getEndOffset(currentScroller) - currentScroller.scrollLeft,
      );

      if (distanceFromEnd > 20) {
        hasUserScrolledRef.current = true;
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleAlignment("resize");
          })
        : null;

    resizeObserver?.observe(scroller);
    resizeObserver?.observe(content);
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelScheduledFrames();
      resizeObserver?.disconnect();
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [cancelScheduledFrames, enabled, scheduleAlignment]);

  return {
    contentRef,
    isInitialPositioned,
    scrollerRef,
  };
}
