"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

export function ModalFrame({
  children,
  className,
  closeOnBackdrop = false,
  contentClassName,
  onClose,
  overlayClassName,
}: {
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  contentClassName?: string;
  onClose?: () => void;
  overlayClassName?: string;
}) {
  return (
    <div
      className={cn(
        "modal-scrim modal-viewport fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md",
        overlayClassName,
      )}
      onClick={() => {
        if (closeOnBackdrop) {
          onClose?.();
        }
      }}
    >
      <GlassCard
        strong
        className={cn(
          "modal-panel flex w-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] shadow-[0_36px_90px_rgba(0,0,0,0.48)]",
          className,
        )}
      >
        <div
          className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {children}
        </div>
      </GlassCard>
    </div>
  );
}

export function ModalBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "modal-body soft-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
