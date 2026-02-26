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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        className="relative w-full max-w-[420px] p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="absolute top-6 right-6">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center text-center space-y-6 mt-4">
          <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-inner ring-8 ring-rose-500/5">
            <IoWarningOutline size={40} />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic">
              Confirm <span className="text-rose-500">Deletion</span>
            </h2>
            <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
              {count > 1
                ? `You are about to permanently purge ${count} records. This operation is irreversible.`
                : "You are about to permanently purge this employee node from the repository."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 mt-10">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50"
          >
            {loading ? "PURGING…" : "CONFIRM PURGE"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            Abort Operation
          </button>
        </div>
      </div>
    </div>
  );
}
