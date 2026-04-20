"use client";

import { useEffect } from "react";

let modalLockDepth = 0;
let lockedScrollY = 0;
let previousStyles:
  | {
      bodyOverflow: string;
      bodyPosition: string;
      bodyTop: string;
      bodyLeft: string;
      bodyRight: string;
      bodyWidth: string;
      bodyOverscrollBehavior: string;
      htmlOverflow: string;
      htmlOverscrollBehavior: string;
    }
  | null = null;

function lockBodyScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  modalLockDepth += 1;

  if (modalLockDepth > 1) {
    return;
  }

  const body = document.body;
  const html = document.documentElement;

  lockedScrollY = window.scrollY;
  previousStyles = {
    bodyLeft: body.style.left,
    bodyOverflow: body.style.overflow,
    bodyOverscrollBehavior: body.style.overscrollBehavior,
    bodyPosition: body.style.position,
    bodyRight: body.style.right,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
  };

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overscrollBehavior = "none";
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.dataset.modalOpen = "true";
}

function unlockBodyScroll() {
  if (typeof window === "undefined" || typeof document === "undefined" || modalLockDepth === 0) {
    return;
  }

  modalLockDepth -= 1;

  if (modalLockDepth > 0) {
    return;
  }

  const body = document.body;
  const html = document.documentElement;

  if (previousStyles) {
    body.style.overflow = previousStyles.bodyOverflow;
    body.style.position = previousStyles.bodyPosition;
    body.style.top = previousStyles.bodyTop;
    body.style.left = previousStyles.bodyLeft;
    body.style.right = previousStyles.bodyRight;
    body.style.width = previousStyles.bodyWidth;
    body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
    html.style.overflow = previousStyles.htmlOverflow;
    html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
  } else {
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overscrollBehavior = "";
    html.style.overflow = "";
    html.style.overscrollBehavior = "";
  }

  delete html.dataset.modalOpen;
  previousStyles = null;
  window.scrollTo(0, lockedScrollY);
}

export function useModalLock({
  closeOnEscape = true,
  onClose,
  open,
}: {
  closeOnEscape?: boolean;
  onClose?: (() => void) | null;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    lockBodyScroll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
    };
  }, [closeOnEscape, onClose, open]);
}
