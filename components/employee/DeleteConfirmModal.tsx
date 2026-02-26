"use client";

import { useRef, useEffect } from "react";
import { IoCloseOutline, IoWarningOutline } from "react-icons/io5";

interface DeleteConfirmModalProps {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  open,
  count,
  onCancel,
  onConfirm,
  loading,
}: DeleteConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        className="card-base relative w-full max-w-[400px] p-6 md:p-8 animate-in zoom-in-95 duration-200 shadow-xl"
      >
        {/* Header */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full transition-colors hover:bg-surface-hover text-text-secondary hover:text-text-primary"
          >
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8 mt-2">
          <div className="w-14 h-14 rounded-full bg-danger-subtle flex items-center justify-center text-danger ring-8 ring-danger/10">
            <IoWarningOutline size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              {count > 1 ? `Remove ${count} employees?` : "Remove employee?"}
            </h2>
            <p className="text-[15px] leading-relaxed max-w-[280px] mx-auto text-text-secondary">
              {count > 1
                ? "This action cannot be undone. Are you sure you want to permanently delete these records?"
                : "This action cannot be undone. Are you sure you want to permanently delete this record?"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] bg-danger hover:bg-danger-hover text-white font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-semibold transition-colors hover:bg-surface-hover disabled:opacity-50 text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
