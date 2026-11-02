"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function DashboardModal({
  open,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={`m-auto max-h-[min(90dvh,48rem)] w-[min(92vw,40rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1624] p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm ${className}`}
    >
      {children}
    </dialog>
  );
}
