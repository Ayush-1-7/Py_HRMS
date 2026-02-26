"use client";

import { useEffect, useRef } from "react";
import { IoCloseOutline, IoPersonOutline } from "react-icons/io5";
import type { IEmployee } from "@/models/Employee";

import AddEmployeeForm from "./AddEmployeeForm";

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: IEmployee | null;
}

export default function EmployeeModal({
  open,
  onClose,
  onSuccess,
  editData,
}: EmployeeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Lock/Unlock scroll */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  /* close on backdrop click */
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in perspective-1000"
    >
      {/* Halo Glows (Expanding outside the box) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[900px] opacity-10 blur-[120px] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-brand-primary animate-pulse duration-[10s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-accent-primary animate-pulse delay-1000" />
      </div>

      <div
        className="relative w-[80vw] h-[80vh] min-h-[80vh] max-h-[80vh] bg-background/95 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-[0_40px_150px_-30px_rgba(0,0,0,0.7)] rounded-[3.5rem] animate-fade-in-up flex flex-col z-10"
      >
        {/* External Floating Close Button (Breaking the Box) */}
        <button
          onClick={onClose}
          className="absolute -top-12 -right-12 p-4 rounded-full bg-surface-base/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:rotate-90 shadow-2xl z-20 group hidden xl:flex"
        >
          <IoCloseOutline size={32} />
          <span className="absolute left-full ml-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold tracking-widest text-white/50">DISMISS MODULE</span>
        </button>

        {/* Decorative Internal Element Bleeding Out (Top Left) */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-primary/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="px-10 py-8 bg-surface-base/40 backdrop-blur-xl border-b border-white/10 dark:border-white/5 flex items-center justify-between shadow-sm flex-shrink-0 relative z-10">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-inner relative ${editData ? 'bg-accent-subtle text-accent-primary' : 'bg-brand-subtle text-brand-primary'}`}>
              <IoPersonOutline size={28} className="animate-pulse relative z-10" />
              {/* Pulsing indicator expanding outside the icon box */}
              <div className={`absolute inset-0 rounded-[1.25rem] animate-ping opacity-20 ${editData ? 'bg-accent-primary' : 'bg-brand-primary'}`} />
            </div>
            <div>
              <h3 className="text-[22px] font-black text-text-primary tracking-tight leading-tight uppercase flex items-center gap-3">
                {editData ? "Refine Personnel Profile" : "Expand Global Workforce"}
                {!editData && <span className="px-2 py-0.5 rounded text-[10px] bg-success-primary/20 text-success-fg border border-success-primary/20">LIVE SYNC</span>}
              </h3>
              <div className="flex items-center gap-2.5 mt-1.5">
                <span className={`w-2 h-2 rounded-full ${editData ? 'bg-accent-primary animate-pulse' : 'bg-brand-primary'}`} />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-text-tertiary">
                  {editData ? "Identity Correction Protocol" : "Pulse Synchronization Active"}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile/Small Screen Close button (visible only if floating is hidden) */}
          <button
            onClick={onClose}
            className="lg:hidden p-3.5 rounded-2xl hover:bg-white/10 dark:hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-all border border-transparent hover:border-border-subtle active:scale-95 group shadow-sm"
          >
            <IoCloseOutline size={28} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden px-10 relative z-0">
          <AddEmployeeForm
            onSuccess={onSuccess}
            onCancel={onClose}
            editData={editData}
          />
        </div>
      </div>
    </div>
  );
}

