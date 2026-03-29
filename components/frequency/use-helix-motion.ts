"use client";

import { useEffect, useState } from "react";

export function useHelixMotionTime(frameStepMs = 40) {
  const [timeSeconds, setTimeSeconds] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame === "undefined") {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotionQuery.matches) {
      return;
    }

    let frameId = 0;
    let startTime = 0;
    let lastCommitTime = 0;

    const tick = (now: number) => {
      if (!startTime) {
        startTime = now;
        lastCommitTime = now;
      }

      if (now - lastCommitTime >= frameStepMs) {
        setTimeSeconds((now - startTime) / 1000);
        lastCommitTime = now;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [frameStepMs]);

  return timeSeconds;
}
